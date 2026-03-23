/**
 * Background Indexing Service
 * Automatically indexes entries in the RAG system on a configurable interval.
 */

import { db, type CodexEntry } from '../lib/db';
import { ragService } from '../ai';
import { dataManager } from '../lib/data-manager';

export interface BackgroundIndexingStatus {
    state: 'idle' | 'running' | 'disabled';
    lastRunTime: Date | null;
    lastRunStats: {
        indexed: number;
        skipped: number;
        failed: number;
    } | null;
    nextRunTime: Date | null;
    currentEntry: string | null;
    progress: { current: number; total: number } | null;
}

type StatusCallback = (status: BackgroundIndexingStatus) => void;

class BackgroundIndexingService {
    private intervalId: ReturnType<typeof setInterval> | null = null;
    private isRunning = false;
    private enabled = true;
    private intervalMinutes = 5;
    private batchSize = 10;
    private reindexIntervalHours = 24;
    private folderWhitelist: string[] = [];
    private statusCallbacks: Set<StatusCallback> = new Set();
    
    private status: BackgroundIndexingStatus = {
        state: 'idle',
        lastRunTime: null,
        lastRunStats: null,
        nextRunTime: null,
        currentEntry: null,
        progress: null
    };

    /**
     * Configure the service
     */
    configure(options: {
        enabled?: boolean;
        intervalMinutes?: number;
        batchSize?: number;
        reindexIntervalHours?: number;
        folderWhitelist?: string[];
    }) {
        const wasEnabled = this.enabled;
        
        if (options.enabled !== undefined) this.enabled = options.enabled;
        if (options.intervalMinutes !== undefined && !isNaN(options.intervalMinutes)) {
            this.intervalMinutes = Math.max(1, Math.min(60, options.intervalMinutes));
        }
        if (options.batchSize !== undefined && !isNaN(options.batchSize)) {
            this.batchSize = Math.max(1, Math.min(200, options.batchSize));
        }
        if (options.reindexIntervalHours !== undefined) this.reindexIntervalHours = options.reindexIntervalHours;
        if (options.folderWhitelist !== undefined) this.folderWhitelist = options.folderWhitelist;

        // Restart if interval changed while running
        if (this.intervalId && wasEnabled && this.enabled) {
            this.stop();
            this.start();
        } else if (!wasEnabled && this.enabled) {
            this.start();
        } else if (wasEnabled && !this.enabled) {
            this.stop();
        }

        console.log(`[BackgroundIndexingService] Configured: enabled=${this.enabled}, interval=${this.intervalMinutes}m, batch=${this.batchSize}`);
    }

    /**
     * Start the background indexing loop
     */
    start() {
        if (!this.enabled) {
            this.updateStatus({ state: 'disabled' });
            console.log('[BackgroundIndexingService] Disabled, not starting');
            return;
        }

        if (this.intervalId) {
            this.stop();
        }

        const intervalMs = this.intervalMinutes * 60 * 1000;
        
        // Run once immediately, then on interval
        this.runOnce();
        
        this.intervalId = setInterval(() => {
            this.runOnce();
        }, intervalMs);

        this.updateStatus({ 
            state: 'idle',
            nextRunTime: new Date(Date.now() + intervalMs)
        });

        console.log(`[BackgroundIndexingService] Started with ${this.intervalMinutes} minute interval`);
    }

    /**
     * Stop the background indexing loop
     */
    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        
        this.updateStatus({ 
            state: this.enabled ? 'idle' : 'disabled',
            nextRunTime: null
        });

        console.log('[BackgroundIndexingService] Stopped');
    }

    /**
     * Run a single indexing pass
     */
    async runOnce(): Promise<{ indexed: number; skipped: number; failed: number }> {
        if (this.isRunning) {
            console.log('[BackgroundIndexingService] Already running, skipping');
            return { indexed: 0, skipped: 0, failed: 0 };
        }

        // Check if RAG is available
        const { available, reason } = await ragService.isAvailable();
        if (!available) {
            console.log(`[BackgroundIndexingService] RAG not available: ${reason}`);
            return { indexed: 0, skipped: 0, failed: 0 };
        }

        this.isRunning = true;
        this.updateStatus({ state: 'running', progress: { current: 0, total: 0 } });

        const stats = { indexed: 0, skipped: 0, failed: 0 };

        try {
            // Get all entries
            const entries = await db.entries.toArray();
            
            // Find entries that need indexing
            const config = dataManager.getConfig();
            const entriesToIndex: CodexEntry[] = [];
            for (const entry of entries) {
                // Check if this type is excluded or has AI disabled
                const typeConfig = config.entries[entry.type];
                if (typeConfig?.excludeFromBackgroundIndexing || typeConfig?.aiFeaturesEnabled === false) {
                    stats.skipped++;
                    continue;
                }

                const needs = await ragService.needsIndexing(entry, this.reindexIntervalHours);
                if (needs) {
                    entriesToIndex.push(entry);
                    if (entriesToIndex.length >= this.batchSize) break;
                } else {
                    stats.skipped++;
                }
            }

            if (entriesToIndex.length === 0) {
                console.log('[BackgroundIndexingService] No entries need indexing');
                this.updateStatus({ 
                    state: 'idle',
                    lastRunTime: new Date(),
                    lastRunStats: stats,
                    progress: null,
                    currentEntry: null,
                    nextRunTime: this.intervalId ? new Date(Date.now() + this.intervalMinutes * 60 * 1000) : null
                });
                return stats;
            }

            console.log(`[BackgroundIndexingService] Indexing ${entriesToIndex.length} entries`);

            this.updateStatus({ progress: { current: 0, total: entriesToIndex.length } });

            // Index entries
            for (let i = 0; i < entriesToIndex.length; i++) {
                const entry = entriesToIndex[i];
                
                this.updateStatus({ 
                    currentEntry: entry.title,
                    progress: { current: i + 1, total: entriesToIndex.length }
                });

                try {
                    const result = await ragService.indexEntry(entry, {
                        folderWhitelist: this.folderWhitelist
                    });
                    if (result.success) {
                        stats.indexed++;
                    } else {
                        stats.failed++;
                        console.warn(`[BackgroundIndexingService] Failed to index: ${entry.id} - ${result.error}`);
                    }
                } catch (e) {
                    stats.failed++;
                    console.error(`[BackgroundIndexingService] Error indexing ${entry.id}:`, e);
                }
            }

            console.log(`[BackgroundIndexingService] Completed: ${stats.indexed} indexed, ${stats.skipped} skipped, ${stats.failed} failed`);

        } catch (e) {
            console.error('[BackgroundIndexingService] Run failed:', e);
        } finally {
            this.isRunning = false;
            this.updateStatus({ 
                state: this.enabled ? 'idle' : 'disabled',
                lastRunTime: new Date(),
                lastRunStats: stats,
                progress: null,
                currentEntry: null,
                nextRunTime: this.intervalId ? new Date(Date.now() + this.intervalMinutes * 60 * 1000) : null
            });
        }

        return stats;
    }

    /**
     * Get current status
     */
    getStatus(): BackgroundIndexingStatus {
        return { ...this.status };
    }

    /**
     * Subscribe to status updates
     */
    onStatusChange(callback: StatusCallback): () => void {
        this.statusCallbacks.add(callback);
        // Immediately send current status
        callback(this.status);
        return () => this.statusCallbacks.delete(callback);
    }

    private updateStatus(partial: Partial<BackgroundIndexingStatus>) {
        this.status = { ...this.status, ...partial };
        this.statusCallbacks.forEach(cb => cb(this.status));
    }
}

export const backgroundIndexingService = new BackgroundIndexingService();
