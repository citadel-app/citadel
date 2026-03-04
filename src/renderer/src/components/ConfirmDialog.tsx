import * as AlertDialog from '@radix-ui/react-alert-dialog';
import { cn } from '../lib/utils';

interface ConfirmDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description: string | React.ReactNode;
    confirmLabel?: string;
    cancelLabel?: string | null;
    onConfirm: () => void;
    variant?: 'default' | 'destructive';
}

export const ConfirmDialog = ({
    open,
    onOpenChange,
    title,
    description,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    onConfirm,
    variant = 'default',
}: ConfirmDialogProps) => {
    return (
        <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
            <AlertDialog.Portal>
                <AlertDialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200 z-50" />
                <AlertDialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-background border border-border rounded-lg shadow-xl p-6 w-full max-w-md animate-in fade-in zoom-in-95 duration-200 z-50">
                    <AlertDialog.Title className="text-lg font-semibold text-foreground">
                        {title}
                    </AlertDialog.Title>
                    <AlertDialog.Description className="text-sm text-muted-foreground mt-2">
                        {description}
                    </AlertDialog.Description>
                    <div className="flex justify-end gap-3 mt-6">
                        {cancelLabel !== null && (
                            <AlertDialog.Cancel asChild>
                                <button className="px-4 py-2 text-sm font-medium rounded-md bg-muted hover:bg-muted/80 text-foreground transition-colors">
                                    {cancelLabel || 'Cancel'}
                                </button>
                            </AlertDialog.Cancel>
                        )}
                        <AlertDialog.Action asChild>
                            <button
                                onClick={onConfirm}
                                className={cn(
                                    "px-4 py-2 text-sm font-medium rounded-md transition-colors",
                                    variant === 'destructive'
                                        ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                        : "bg-primary text-primary-foreground hover:bg-primary/90"
                                )}
                            >
                                {confirmLabel}
                            </button>
                        </AlertDialog.Action>
                    </div>
                </AlertDialog.Content>
            </AlertDialog.Portal>
        </AlertDialog.Root>
    );
};
