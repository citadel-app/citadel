import { Icon, Dialog, DialogContent, DialogHeader, DialogTitle } from '@citadel-app/ui';
import React, { useState, useRef } from 'react';
import { useRSSStrict } from '../../context/RSSContext';

interface AddFeedDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export const AddFeedDialog = ({ open, onOpenChange }: AddFeedDialogProps) => {
    const { addFeed, importOpml, feeds } = useRSSStrict();
    const [url, setUrl] = useState('');
    const [title, setTitle] = useState('');
    const [folder, setFolder] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!url.trim()) return;

        setIsSubmitting(true);
        setError(null);
        try {
            await addFeed(url.trim(), folder.trim() || undefined, title.trim() || undefined);
            setUrl('');
            setTitle('');
            setFolder('');
            onOpenChange(false);
        } catch (err: any) {
            setError(err.message || 'Failed to add feed');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleOpmlUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsSubmitting(true);
        setError(null);
        try {
            const text = await file.text();
            await importOpml(text);
            onOpenChange(false);
        } catch (err: any) {
            setError(err.message || 'Failed to import OPML');
        } finally {
            setIsSubmitting(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>
                        Add RSS Feed
                    </DialogTitle>
                </DialogHeader>

                <div className="p-6 space-y-6">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">
                                Feed URL <span className="text-red-500">*</span>
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="url"
                                    value={url}
                                    onChange={(e) => setUrl(e.target.value)}
                                    placeholder="https://example.com/feed.xml"
                                    className="flex-1 p-2.5 rounded-md border border-input bg-background focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
                                    autoFocus
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">
                                Title (Optional)
                            </label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="My Tech Blog"
                                className="w-full p-2.5 rounded-md border border-input bg-background focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">
                                Folder (Optional)
                            </label>
                            <input
                                type="text"
                                value={folder}
                                onChange={(e) => setFolder(e.target.value)}
                                placeholder="Tech, News, etc."
                                list="folder-suggestions"
                                className="w-full p-2.5 rounded-md border border-input bg-background focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
                            />
                            <datalist id="folder-suggestions">
                                {Array.from(new Set(feeds.map(f => f.folder).filter(Boolean))).sort().map(f => (
                                    <option key={f} value={f} />
                                ))}
                            </datalist>
                        </div>

                        {error && (
                            <div className="text-sm text-red-500 bg-red-500/10 p-2 rounded">
                                {error}
                            </div>
                        )}

                        <div className="flex justify-end gap-2">
                            <button
                                type="submit"
                                disabled={isSubmitting || !url.trim()}
                                className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md shadow hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                                {isSubmitting ? <Icon name="Loader2" size={16} className="animate-spin" /> : <Icon name="Plus" size={16} />}
                                Add Feed
                            </button>
                        </div>
                    </form>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-border" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-card px-2 text-muted-foreground">Or import from file</span>
                        </div>
                    </div>

                    <div>
                        <input
                            type="file"
                            accept=".opml,.xml"
                            onChange={handleOpmlUpload}
                            className="hidden"
                            ref={fileInputRef}
                        />
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isSubmitting}
                            className="w-full flex items-center justify-center gap-2 p-2.5 rounded-md border border-dashed border-input bg-muted/20 hover:bg-muted/50 transition-colors text-sm font-medium"
                        >
                            <Icon name="Upload" size={16} />
                            Import OPML
                        </button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};
