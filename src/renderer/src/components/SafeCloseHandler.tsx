import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { useGit } from '../context/GitContext';
import { Icon } from './IconRegistry';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { IPC_CHANNELS } from '@shared';

export const SafeCloseHandler = () => {
    const [open, setOpen] = useState(false);
    const { status, commit, push, refreshStatus } = useGit();
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const handleCloseRequest = async () => {
            console.log("[SafeClose] Close requested");
            // Refresh status to be sure
            await refreshStatus();

            // Check for dirty state
            // We need to access the LATEST status, so we might need to rely on the state update or a ref if this closure is stale.
            // However, since this effect runs once, we should depend on status? 
            // Better: use a ref or check values inside the handler if possible, but status is from context.
            // Let's assume the context is roughly up to date or we wait for refresh.
            // Since refreshStatus is async, we can wait for it.

            // For now, let's just use the status we have after a short delay or assume refreshStatus updates the context *eventually*.
            // Actually, querying the main process or git service directly would be safer, but context is what we have.

            // A safer pattern:
            // 1. Trigger refresh
            // 2. setOpen(true) temporarily? No, that would flash.

            // Let's rely on the context status for now.
            // We can use a dirty check function if exposed, but inspection of `status` object is fine.
            const isDirty = status && ((status.files?.length || 0) > 0 || (status.ahead || 0) > 0);

            if (isDirty) {
                setOpen(true);
            } else {
                confirmClose();
            }
        };

        const removeListener = window.electron.ipcRenderer.on(IPC_CHANNELS.APP_CLOSE_REQUEST, handleCloseRequest);
        return () => {
            removeListener();
        };
    }, [status, refreshStatus]);

    const confirmClose = () => {
        window.electron.ipcRenderer.send(IPC_CHANNELS.APP_CLOSE_CONFIRMED);
    };

    const handleCloseAnyway = () => {
        confirmClose();
    };

    const handleCommitAndPush = async () => {
        setIsProcessing(true);
        setError(null);
        try {
            if (status && status.files && status.files.length > 0) {
                await commit("Auto-save before close");
            }
            await push();
            confirmClose();
        } catch (err: any) {
            console.error(err);
            setError(err.message || "Failed to sync changes. Merge conflicts might be present.");
            setIsProcessing(false);
        }
    };

    const handlePushOnly = async () => {
        setIsProcessing(true);
        setError(null);
        try {
            await push();
            confirmClose();
        } catch (err: any) {
            console.error(err);
            setError(err.message || "Failed to push changes.");
            setIsProcessing(false);
        }
    };

    if (!open) return null;

    const hasUncommitted = status?.files?.length > 0;
    const hasUnpushed = status?.ahead > 0;

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="sm:max-w-[425px]" onInteractOutside={(e) => e.preventDefault()}>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Icon name="AlertTriangle" className="text-yellow-500" size={20} />
                        Pending Changes
                    </DialogTitle>
                    <DialogDescription>
                        You have unsaved changes in your workspace.
                        {hasUncommitted && <div className="mt-2 text-foreground">• {status.files.length} uncommitted files</div>}
                        {hasUnpushed && <div className="mt-1 text-foreground">• {status.ahead} unpushed commits</div>}
                    </DialogDescription>
                </DialogHeader>

                {error && (
                    <Alert variant="destructive" className="my-2">
                        <Icon name="AlertCircle" className="h-4 w-4" />
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                <DialogFooter className="flex-col sm:flex-row gap-2">
                    <Button variant="ghost" onClick={() => setOpen(false)} disabled={isProcessing}>
                        Cancel
                    </Button>
                    <Button variant="destructive" onClick={handleCloseAnyway} disabled={isProcessing}>
                        Close Anyway
                    </Button>

                    {hasUncommitted ? (
                        <Button onClick={handleCommitAndPush} disabled={isProcessing}>
                            {isProcessing ? "Syncing..." : "Commit & Push"}
                        </Button>
                    ) : (
                        <Button onClick={handlePushOnly} disabled={isProcessing}>
                            {isProcessing ? "Pushing..." : "Push & Close"}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
