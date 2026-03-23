import { Icon } from '@citadel-app/ui';
import { APP_CONSTANTS } from '@citadel-app/core';
import { NotebookConfig } from '../../pages/NotebookPage';
import { EntryDetailView } from '../EntryDetailView';
import { db } from '../../lib/db';
import { useLiveQuery } from 'dexie-react-hooks';

import { formatDistanceToNow } from 'date-fns';

interface NotebookContentProps {
    entryId: string | null;
    notebook: NotebookConfig;
    onToggleCompletion: (entryId: string) => void;
}

export const NotebookContent = ({ entryId, notebook, onToggleCompletion }: NotebookContentProps) => {
    const entry = useLiveQuery(
        () => db.entries.get(entryId || ''),
        [entryId]
    ) as any;

    const completions = entryId ? notebook.completions?.[entryId] || [] : [];
    const lastCompletion = completions.length > 0 ? completions[completions.length - 1] : null;

    if (!entryId) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground bg-muted/5 animate-in fade-in duration-500">
                <div className="relative mb-6">
                    <Icon name="BookOpen" size={82} strokeWidth={0.5} className="opacity-10" />
                    <Icon name="ArrowLeft" size={24} className="absolute -left-12 top-1/2 -translate-y-1/2 opacity-20 animate-pulse" />
                </div>
                <h3 className="text-lg font-black uppercase tracking-tighter italic opacity-40 mb-1">
                    Empty Chapter
                </h3>
                <p className="text-xs font-medium opacity-30">
                    Select an entry from the sidebar to read its contents.
                </p>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col min-h-0 bg-background overflow-hidden relative">
            {/* Header / Breadcrumbs */}
            <div className="h-14 px-6 border-b border-border/40 flex items-center justify-between bg-muted/5 backdrop-blur-sm z-10 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-primary/10 border border-primary/20 shadow-sm">
                        <Icon name="Book" size={12} className="text-primary" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-primary">
                            {notebook.name}
                        </span>
                    </div>
                    <Icon name="ChevronRight" size={12} className="text-muted-foreground/30" />
                    <div className="flex items-center gap-2 group cursor-default">
                        <Icon name="FileText" size={14} className="text-muted-foreground/40 group-hover:text-primary transition-colors" />
                        <span className="text-xs font-black uppercase tracking-tight truncate max-w-xs transition-colors">
                            {entry?.title || APP_CONSTANTS.UI.LOADING}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {lastCompletion && (
                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500/10 text-[9px] font-bold uppercase tracking-widest text-green-500 border border-green-500/20">
                            <Icon name="CheckCircle" size={10} />
                            <span>Completed {formatDistanceToNow(lastCompletion.completedAt)} ago</span>
                        </div>
                    )}

                    <button
                        onClick={() => entryId && onToggleCompletion(entryId)}
                        className="flex items-center gap-2 px-4 py-1.5 rounded-xl bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
                    >
                        <Icon name="Check" size={12} strokeWidth={3} />
                        Mark Completed
                    </button>

                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted/30 text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60">
                        <Icon name="Clock" size={10} />
                        <span>{entry ? new Date(entry.updatedAt).toLocaleDateString() : '...'}</span>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col overflow-hidden min-h-0">
                <EntryDetailView id={entryId} isNotebook={true} />
            </div>
        </div>
    );
};
