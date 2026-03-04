import { useState, useCallback } from 'react';
import { Icon } from '../IconRegistry';
import { cn } from '../../lib/utils';

interface RelatedLink {
    id: string;
    title: string;
    url: string;
    isInternal: boolean; // true = internal entry link, false = external URL
}

interface RelatedLinksSectionProps {
    links: RelatedLink[];
    onAddLink: (link: Omit<RelatedLink, 'id'>) => void;
    onRemoveLink: (id: string) => void;
    className?: string;
}

export const RelatedLinksSection = ({
    links,
    onAddLink,
    onRemoveLink,
    className
}: RelatedLinksSectionProps) => {
    const [isAdding, setIsAdding] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [newUrl, setNewUrl] = useState('');
    const [isInternal, setIsInternal] = useState(false);

    const handleAdd = useCallback(() => {
        if (newTitle.trim() && newUrl.trim()) {
            onAddLink({
                title: newTitle.trim(),
                url: newUrl.trim(),
                isInternal
            });
            setNewTitle('');
            setNewUrl('');
            setIsAdding(false);
        }
    }, [newTitle, newUrl, isInternal, onAddLink]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAdd();
        } else if (e.key === 'Escape') {
            setIsAdding(false);
        }
    };

    return (
        <div className={cn("rounded-lg border border-border p-4", className)}>
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <Icon name="Link" size={16} className="text-muted-foreground" />
                    <h3 className="font-semibold text-sm">Related Links</h3>
                </div>
                {!isAdding && (
                    <button
                        onClick={() => setIsAdding(true)}
                        className="p-1.5 hover:bg-muted rounded transition-colors"
                        title="Add link"
                    >
                        <Icon name="Plus" size={14} />
                    </button>
                )}
            </div>

            {/* Links List */}
            <div className="space-y-2">
                {links.length === 0 && !isAdding && (
                    <p className="text-sm text-muted-foreground italic">No related links yet.</p>
                )}

                {links.map(link => (
                    <div
                        key={link.id}
                        className="flex items-center justify-between group p-2 rounded hover:bg-muted/50 transition-colors"
                    >
                        <a
                            href={link.isInternal ? `#/entry/${link.url}` : link.url}
                            target={link.isInternal ? undefined : '_blank'}
                            rel={link.isInternal ? undefined : 'noopener noreferrer'}
                            className="flex items-center gap-2 text-sm hover:underline"
                        >
                            <Icon
                                name={link.isInternal ? 'FileText' : 'ExternalLink'}
                                size={14}
                                className="text-muted-foreground"
                            />
                            {link.title}
                        </a>
                        <button
                            onClick={() => onRemoveLink(link.id)}
                            className="p-1 opacity-0 group-hover:opacity-100 hover:bg-red-500/20 text-muted-foreground hover:text-red-500 rounded transition-all"
                            title="Remove"
                        >
                            <Icon name="X" size={12} />
                        </button>
                    </div>
                ))}

                {/* Add Form */}
                {isAdding && (
                    <div className="space-y-2 p-2 rounded bg-muted/30 border border-border">
                        <input
                            type="text"
                            value={newTitle}
                            onChange={(e) => setNewTitle(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Link title"
                            className="w-full p-2 text-sm rounded border border-input bg-background focus:ring-1 focus:ring-primary outline-none"
                            autoFocus
                        />
                        <input
                            type="text"
                            value={newUrl}
                            onChange={(e) => setNewUrl(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={isInternal ? "Entry ID" : "https://..."}
                            className="w-full p-2 text-sm rounded border border-input bg-background focus:ring-1 focus:ring-primary outline-none"
                        />
                        <div className="flex items-center justify-between">
                            <label className="flex items-center gap-2 text-xs text-muted-foreground">
                                <input
                                    type="checkbox"
                                    checked={isInternal}
                                    onChange={(e) => setIsInternal(e.target.checked)}
                                    className="rounded"
                                />
                                Internal link
                            </label>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setIsAdding(false)}
                                    className="px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleAdd}
                                    disabled={!newTitle.trim() || !newUrl.trim()}
                                    className="px-2 py-1 text-xs bg-primary text-primary-foreground rounded disabled:opacity-50"
                                >
                                    Add
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
