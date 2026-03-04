import { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Icon } from '../IconRegistry';
import { useRSS } from '../../context/RSSContext';

interface EditFeedDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    feedId: string | null;
}

export const EditFeedDialog = ({ open, onOpenChange, feedId }: EditFeedDialogProps) => {
    const { feeds, updateFeed } = useRSS();
    const [title, setTitle] = useState('');
    const [url, setUrl] = useState('');
    const [folder, setFolder] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (open && feedId) {
            const feed = feeds.find(f => f.id === feedId);
            if (feed) {
                setTitle(feed.title);
                setUrl(feed.url);
                setFolder(feed.folder || '');
            }
        }
    }, [open, feedId, feeds]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!feedId) return;

        setIsSubmitting(true);
        try {
            await updateFeed(feedId, {
                title: title.trim(),
                url: url.trim(),
                folder: folder.trim() || undefined
            });
            onOpenChange(false);
        } catch (err: any) {
            console.error('Failed to update feed', err);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 transition-all duration-200" />
                <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-card border border-border shadow-xl rounded-xl z-50 flex flex-col">
                    <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                        <Dialog.Title className="text-lg font-semibold flex items-center gap-2">
                            Edit Feed
                        </Dialog.Title>
                        <Dialog.Close className="p-1 rounded-md text-muted-foreground hover:bg-muted transition-colors">
                            <Icon name="X" size={20} />
                        </Dialog.Close>
                    </div>

                    <div className="p-6 space-y-4">
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground">
                                    Title
                                </label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="w-full p-2.5 rounded-md border border-input bg-background focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground">
                                    Feed URL
                                </label>
                                <input
                                    type="url"
                                    value={url}
                                    onChange={(e) => setUrl(e.target.value)}
                                    className="w-full p-2.5 rounded-md border border-input bg-background focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground">
                                    Folder
                                </label>
                                <input
                                    type="text"
                                    value={folder}
                                    onChange={(e) => setFolder(e.target.value)}
                                    placeholder="Uncategorized"
                                    className="w-full p-2.5 rounded-md border border-input bg-background focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => onOpenChange(false)}
                                    className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting || !title.trim() || !url.trim()}
                                    className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md shadow hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
                                >
                                    {isSubmitting ? <Icon name="Loader2" size={16} className="animate-spin" /> : <Icon name="Check" size={16} />}
                                    Save Changes
                                </button>
                            </div>
                        </form>
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
};
