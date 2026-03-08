import { Icon } from '../../components/IconRegistry';
import { cn } from '../../lib/utils';
import { Suggestion } from '@shared';

interface InlineSearchIntellisenseProps {
    suggestions: Suggestion[];
    selectedIndex: number;
    onSelect: (suggestion: Suggestion) => void;
    onSelectIndexChange: (index: number) => void;
}

export const InlineSearchIntellisense = ({
    suggestions,
    selectedIndex,
    onSelect,
    onSelectIndexChange
}: InlineSearchIntellisenseProps) => {
    if (suggestions.length === 0) return null;

    return (
        <div className="absolute bottom-full mb-2 left-4 w-64 bg-card border border-border rounded-xl shadow-2xl overflow-hidden z-[100] animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="p-2 border-b border-border bg-muted/30 flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-1">Search Suggestions</span>
                <span className="text-[10px] text-muted-foreground opacity-50 px-1">↑↓ to navigate</span>
            </div>
            <div className="flex flex-col max-h-64 overflow-y-auto p-1">
                {suggestions.map((s, idx) => (
                    <button
                        key={`${s.text}-${idx}`}
                        onMouseEnter={() => onSelectIndexChange(idx)}
                        onClick={() => onSelect(s)}
                        className={cn(
                            "w-full px-3 py-2 text-left flex items-center gap-3 transition-all rounded-lg border border-transparent",
                            selectedIndex === idx
                                ? "bg-primary/10 border-primary/20 text-primary translate-x-1"
                                : "hover:bg-muted text-muted-foreground"
                        )}
                    >
                        <div className={cn(
                            "w-6 h-6 rounded-md flex items-center justify-center shrink-0",
                            selectedIndex === idx ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                        )}>
                            <Icon
                                name={s.icon || 'Hash'}
                                size={12}
                                className={selectedIndex === idx ? "text-primary-foreground" : ""}
                            />
                        </div>
                        <div className="flex flex-col flex-1 min-w-0">
                            <span className="text-[11px] font-bold truncate">
                                {s.text.replace(/^#"|^#|^"|"$|:$/g, '')}
                            </span>
                            {s.description && (
                                <span className="text-[9px] truncate opacity-60">
                                    {s.description}
                                </span>
                            )}
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
};
