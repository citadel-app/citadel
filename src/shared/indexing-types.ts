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
