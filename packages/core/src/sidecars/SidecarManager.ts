import { EventEmitter } from 'events';
import { exec } from 'child_process';
import { promisify } from 'util';
import { ISidecar } from './types';

const execAsync = promisify(exec);

export class SidecarManager extends EventEmitter {
    private sidecars: Map<string, ISidecar> = new Map();
    private isDockerAvailable: boolean | null = null;

    /**
     * Register a new sidecar implementation with the manager.
     */
    public registerSidecar(sidecar: ISidecar): void {
        const id = sidecar.config.id;
        if (this.sidecars.has(id)) {
            console.warn(`[SidecarManager] Sidecar with ID ${id} is already registered. Overwriting.`);
        }
        this.sidecars.set(id, sidecar);
        console.log(`[SidecarManager] Registered sidecar: ${id}`);
    }

    /**
     * Get a registered sidecar by ID.
     */
    public getSidecar(id: string): ISidecar | undefined {
        return this.sidecars.get(id);
    }

    /**
     * Start a specific sidecar by ID.
     */
    public async startSidecar(id: string): Promise<boolean> {
        const sidecar = this.sidecars.get(id);
        if (!sidecar) {
            console.error(`[SidecarManager] Cannot start unknown sidecar: ${id}`);
            return false;
        }

        const isDockerReady = await this.checkDocker();
        if (!isDockerReady) {
            console.warn(`[SidecarManager] Docker is not available. Cannot start sidecar: ${id}`);
            return false;
        }

        try {
            console.log(`[SidecarManager] Starting sidecar: ${id}`);
            const success = await sidecar.start();
            if (success) {
                this.emit('started', { id });
            }
            return success;
        } catch (error) {
            console.error(`[SidecarManager] Finished starting sidecar ${id} with error:`, error);
            return false;
        }
    }

    /**
     * Stop a specific sidecar by ID.
     */
    public async stopSidecar(id: string): Promise<boolean> {
        const sidecar = this.sidecars.get(id);
        if (!sidecar) {
            console.error(`[SidecarManager] Cannot stop unknown sidecar: ${id}`);
            return false;
        }

        try {
            console.log(`[SidecarManager] Stopping sidecar: ${id}`);
            const success = await sidecar.stop();
            if (success) {
                this.emit('stopped', { id });
            }
            return success;
        } catch (error) {
            console.error(`[SidecarManager] Error stopping sidecar ${id}:`, error);
            return false;
        }
    }

    /**
     * Send input to a REPL sidecar by ID.
     */
    public sendInput(id: string, data: string): boolean {
        const sidecar = this.sidecars.get(id);
        if (!sidecar) {
            console.warn(`[SidecarManager] Cannot send input to unknown sidecar: ${id}`);
            return false;
        }

        if (sidecar.config.type !== 'repl') {
            console.warn(`[SidecarManager] Cannot send input to non-REPL sidecar: ${id}`);
            return false;
        }

        if (sidecar.sendInput) {
            sidecar.sendInput(data);
            return true;
        }

        return false;
    }

    /**
     * Stop all registered sidecars.
     */
    public async stopAll(): Promise<void> {
        console.log('[SidecarManager] Stopping all sidecars...');
        const promises = Array.from(this.sidecars.values()).map(sidecar => sidecar.stop());
        
        const results = await Promise.allSettled(promises);
        
        const failures = results.filter(r => r.status === 'rejected');
        if (failures.length > 0) {
            console.warn(`[SidecarManager] ${failures.length} sidecars failed to stop gracefully.`);
        } else {
            console.log('[SidecarManager] All sidecars stopped successfully.');
        }
    }

    /**
     * Return the status of all registered sidecars.
     */
    public getStatuses(): Array<{ id: string, status: string }> {
        return Array.from(this.sidecars.values()).map(sidecar => ({
            id: sidecar.config.id,
            status: sidecar.status
        }));
    }

    /**
     * Check if the Docker daemon is responding. Alert the user if not.
     */
    private async checkDocker(): Promise<boolean> {
        if (this.isDockerAvailable === true) {
            return true;
        }

        try {
            await execAsync('docker info');
            this.isDockerAvailable = true;
            return true;
        } catch (error) {
            console.warn('[SidecarManager] Docker is not running or not found.');
            this.isDockerAvailable = false;
            
            // Note: Native dialog code removed for generic core abstraction
            return false;
        }
    }
}
