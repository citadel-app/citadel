import { memo, useMemo } from 'react';
import { cn } from '../lib/utils';
import { Icon } from './IconRegistry';
import { MarkdownViewer } from './MarkdownViewer';
import { ChatMessage } from '../lib/db';
import { useNavigate } from 'react-router-dom';

interface ChatMessageItemProps {
    msg: ChatMessage;
    isZen?: boolean;
    isLast?: boolean;
    isGenerating?: boolean;
}

export const ChatMessageItem = memo(({ msg, isZen, isLast, isGenerating }: ChatMessageItemProps) => {
    const navigate = useNavigate();

    // Parse actions from message content
    const actions: { url: string; title: string }[] = useMemo(() => {
        if (msg.role !== 'assistant' || typeof msg.content !== 'string') return [];
        try {
            const matches = [...msg.content.matchAll(/<action\s+type="navigate"\s+url="([^"]+)"\s+title="([^"]+)"\s*\/>/g)];
            return matches.map(m => ({
                url: m[1],
                title: m[2]
            }));
        } catch (e) {
            console.error('[ChatMessageItem] Failed to parse actions:', e);
            return [];
        }
    }, [msg.content, msg.role]);

    // Clean content (strip action tags for display)
    const cleanContent = useMemo(() => {
        if (typeof msg.content !== 'string') return '';
        return msg.content.replace(/<action\s+[^>]*\/>/g, '').trim();
    }, [msg.content]);

    const hasContent = msg.role === 'user'
        ? (typeof msg.content === 'string' && msg.content.trim().length > 0)
        : (cleanContent.length > 0);

    const showThinking = msg.role === 'assistant' && !hasContent && isLast && isGenerating;
    const hasSources = msg.sources && msg.sources.length > 0;
    const hasActions = actions.length > 0;

    // Skip rendering entirely if there's no content, no sources, no actions, AND we aren't "thinking"
    if (!hasContent && !hasSources && !hasActions && !showThinking) return null;

    return (
        <div className={cn(
            "flex flex-col group/msg transition-all duration-300",
            msg.role === 'user' ? 'items-end' : 'items-start'
        )}>
            {(hasContent || showThinking) && (
                <div className={cn(
                    "max-w-[85%] rounded-2xl shadow-sm overflow-hidden transition-all duration-500 hover:shadow-md",
                    isZen && "max-w-[100%]",
                    msg.role === 'user'
                        ? 'bg-secondary text-secondary-foreground rounded-tr-none px-5 py-4'
                        : 'bg-card border border-border rounded-tl-none'
                )}>
                    {msg.role === 'user' ? (
                        <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap text-sm leading-relaxed font-medium">
                            {typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)}
                        </div>
                    ) : (
                        <div className="flex flex-col">
                            {hasContent ? (
                                <MarkdownViewer content={cleanContent} />
                            ) : (
                                <div className="p-5 flex items-center gap-3 text-muted-foreground animate-pulse text-sm italic">
                                    <div className="w-2 h-2 rounded-full bg-primary/40 animate-bounce" />
                                    Thinking...
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Smart Bubbles / Actions */}
            {actions.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3 px-1 animate-in fade-in slide-in-from-top-1 duration-300">
                    {actions.map((action, idx) => (
                        <button
                            key={idx}
                            onClick={() => navigate(action.url)}
                            className="bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold px-3 py-2 rounded-xl border border-primary/20 transition-all flex items-center gap-2 shadow-sm group"
                        >
                            <Icon name="ExternalLink" size={14} className="group-hover:scale-110 transition-transform" />
                            <span>Navigate to {action.title}</span>
                        </button>
                    ))}
                </div>
            )}

            {/* Message Sources (Small badges under assistant messages) */}
            {msg.role === 'assistant' && msg.sources && msg.sources.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2 px-1">
                    {msg.sources.map(s => (
                        <button
                            key={s.id}
                            onClick={() => navigate(`/${s.type}/${s.id}`)}
                            className="text-[10px] bg-muted hover:bg-muted/80 text-muted-foreground px-2 py-0.5 rounded border border-border transition-colors flex items-center gap-1"
                        >
                            <Icon name="FileText" size={10} />
                            {s.title}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
});
