import { useState, useRef, useEffect } from 'react';
import { Popover, PopoverTrigger, PopoverContent, PopoverAnchor } from '@citadel-app/ui';
import { Icon } from '@citadel-app/ui';
import { cn } from '@citadel-app/ui';
import { useSearchIntellisense, Suggestion } from '../hooks/useSearchIntellisense';
import { SearchHelpDialog } from './SearchHelpDialog';

interface SearchInputProps {
    value: string;
    onChange: (value: string) => void;
    onClear?: () => void;
    placeholder?: string;
    className?: string;
    id?: string;
}

export const SearchInput = ({
    value,
    onChange,
    onClear,
    placeholder = 'Search...',
    className,
    id
}: SearchInputProps) => {
    const [cursorPos, setCursorPos] = useState(-1);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [isHelpOpen, setIsHelpOpen] = useState(false);
    const [displayLimit, setDisplayLimit] = useState(50);
    const inputRef = useRef<HTMLInputElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    const { suggestions, range } = useSearchIntellisense(value, cursorPos);

    useEffect(() => {
        if (!showSuggestions) return;

        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                e.stopImmediatePropagation();
                setShowSuggestions(false);
            }
        };

        // Use capture phase to beat Radix's global listeners
        window.addEventListener('keydown', handleEscape, true);
        return () => window.removeEventListener('keydown', handleEscape, true);
    }, [showSuggestions]);

    useEffect(() => {
        setSelectedIndex(0);
        setDisplayLimit(50);
    }, [suggestions]);

    useEffect(() => {
        if (showSuggestions && scrollRef.current) {
            const selectedElement = scrollRef.current.children[0]?.children[selectedIndex] as HTMLElement;
            if (selectedElement) {
                const container = scrollRef.current;
                const elementTop = selectedElement.offsetTop;
                const elementBottom = elementTop + selectedElement.offsetHeight;
                const containerTop = container.scrollTop;
                const containerBottom = containerTop + container.offsetHeight;

                if (elementTop < containerTop) {
                    container.scrollTop = elementTop;
                } else if (elementBottom > containerBottom) {
                    container.scrollTop = elementBottom - container.offsetHeight;
                }
            }
        }
    }, [selectedIndex, showSuggestions]);

    const handleSelectSuggestion = (suggestion: Suggestion) => {
        if (!range) return;

        let insertText = suggestion.text;
        if (suggestion.type === 'operator') {
            insertText += ' ';
        } else if (suggestion.type === 'field' && !insertText.endsWith(':')) {
            insertText += ':';
        }

        const newQuery = value.slice(0, range.start) +
            insertText +
            value.slice(range.end);

        onChange(newQuery);

        const newPos = range.start + insertText.length;
        setTimeout(() => {
            if (inputRef.current) {
                inputRef.current.focus();
                inputRef.current.setSelectionRange(newPos, newPos);
                setCursorPos(newPos);
            }
        }, 0);

        setShowSuggestions(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        // Note: Escape is now handled by the native window interceptor in useEffect

        if (e.ctrlKey && e.code === 'Space') {
            e.preventDefault();
            setShowSuggestions(true);
            return;
        }

        if (showSuggestions && suggestions.length > 0) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex(prev => {
                    const next = (prev + 1) % suggestions.length;
                    if (next >= displayLimit - 5) {
                        setDisplayLimit(prev => Math.min(prev + 50, suggestions.length));
                    }
                    return next;
                });
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex(prev => (prev - 1 + suggestions.length) % suggestions.length);
            } else if (e.key === 'Enter' || e.key === 'Tab') {
                e.preventDefault();
                handleSelectSuggestion(suggestions[selectedIndex]);
            }
        }
    };

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
        if (scrollHeight - scrollTop <= clientHeight + 50) {
            if (displayLimit < suggestions.length) {
                setDisplayLimit(prev => Math.min(prev + 50, suggestions.length));
            }
        }
    };

    const updateCursorPos = (e: React.SyntheticEvent<HTMLInputElement>) => {
        const pos = e.currentTarget.selectionStart;
        if (pos !== null) setCursorPos(pos);
    };

    return (
        <div className={cn("relative flex items-center gap-2", className)}>
            <div className="relative flex-1 group">
                <Icon name="Search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <input
                    ref={inputRef}
                    id={id}
                    type="text"
                    value={value}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    onKeyDownCapture={handleKeyDown}
                    onKeyUp={updateCursorPos}
                    onSelect={updateCursorPos}
                    onClick={updateCursorPos}
                    onChange={(e) => {
                        onChange(e.target.value);
                        updateCursorPos(e);
                    }}
                    placeholder={placeholder}
                    className="w-full bg-background border border-border rounded-lg pl-9 pr-10 py-2 text-sm focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-muted-foreground/30 shadow-sm hover:border-border/80"
                />

                {value && (
                    <button
                        onClick={onClear}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-muted"
                    >
                        <Icon name="X" size={12} />
                    </button>
                )}

                {showSuggestions && suggestions.length > 0 && (
                    <div
                        ref={scrollRef}
                        onScroll={handleScroll}
                        className="absolute top-full left-0 w-full mt-2 bg-popover border border-border shadow-2xl rounded-xl z-[100] max-h-72 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200"
                    >
                        <div className="p-1.5 flex flex-col gap-0.5">
                            {suggestions.slice(0, displayLimit).map((s, idx) => (
                                <button
                                    key={`${s.text}-${idx}`}
                                    type="button"
                                    onClick={() => handleSelectSuggestion(s)}
                                    onMouseEnter={() => setSelectedIndex(idx)}
                                    className={cn(
                                        "w-full px-3 py-2 text-left flex items-center gap-3 transition-all rounded-lg",
                                        selectedIndex === idx ? "bg-primary text-primary-foreground shadow-md" : "hover:bg-muted"
                                    )}
                                >
                                    <div className={cn(
                                        "w-6 h-6 rounded-md flex items-center justify-center shrink-0",
                                        selectedIndex === idx ? "bg-primary-foreground/20" : "bg-muted"
                                    )}>
                                        <Icon
                                            name={s.icon || 'Hash'}
                                            size={12}
                                            className={cn(
                                                selectedIndex === idx ? "text-primary-foreground" :
                                                    s.type === 'tag' ? "text-blue-500" :
                                                        s.type === 'field' ? "text-purple-500" :
                                                            s.type === 'operator' ? "text-orange-500" : "text-emerald-500"
                                            )}
                                        />
                                    </div>
                                    <div className="flex flex-col flex-1 min-w-0">
                                        <span className="text-[12px] font-bold truncate">
                                            {s.text.replace(/^#"|^#|^"|"$|:$/g, '')}
                                        </span>
                                        {s.description && (
                                            <span className={cn(
                                                "text-[9px] truncate opacity-60",
                                                selectedIndex === idx ? "text-primary-foreground" : ""
                                            )}>
                                                {s.description}
                                            </span>
                                        )}
                                    </div>
                                    {selectedIndex === idx && (
                                        <span className="text-[10px] opacity-40 font-mono">↵</span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <Popover>
                <PopoverTrigger asChild>
                    <button className="text-muted-foreground hover:text-primary transition-colors focus:outline-none p-2 rounded-lg hover:bg-muted shadow-sm border border-border">
                        <Icon name="Info" size={14} />
                    </button>
                </PopoverTrigger>
                
                    <PopoverContent
                        className="w-80 bg-popover text-popover-foreground rounded-xl border border-border shadow-2xl p-5 z-50 animate-in fade-in zoom-in-95"
                        sideOffset={10}
                        align="end"
                    >
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 pb-3 border-b border-border">
                                <Icon name="Search" size={16} className="text-primary" />
                                <h3 className="text-sm font-bold tracking-tight">Search Handbook</h3>
                            </div>

                            <div className="space-y-4 text-[11px] leading-relaxed">
                                <section>
                                    <p className="font-bold text-primary mb-1.5 uppercase tracking-wider text-[9px]">Logic & Flow</p>
                                    <p>Combine terms with <code className="bg-muted px-1 rounded text-primary font-bold">AND</code>, <code className="bg-muted px-1 rounded text-primary font-bold">OR</code>, <code className="bg-muted px-1 rounded text-primary font-bold">NOT</code>.</p>
                                </section>

                                <section>
                                    <p className="font-bold text-primary mb-1.5 uppercase tracking-wider text-[9px]">Metadata & Pins</p>
                                    <p>Find exact data using <code className="text-primary font-bold">key:value</code>.</p>
                                    <p className="text-muted-foreground mt-1 underline decoration-primary/20">Example: <code className="italic">difficulty:Hard</code></p>
                                </section>

                                <section>
                                    <p className="font-bold text-primary mb-1.5 uppercase tracking-wider text-[9px]">Tags</p>
                                    <p>Discover tags using <code className="text-primary font-bold">#tagname</code>.</p>
                                </section>

                                <button
                                    onClick={() => setIsHelpOpen(true)}
                                    className="w-full mt-2 py-2.5 rounded-xl border border-primary/20 bg-primary/5 text-primary text-[10px] font-black uppercase tracking-widest hover:bg-primary/10 transition-all flex items-center justify-center gap-2 group"
                                >
                                    Detailed Handbook
                                    <Icon name="ArrowRight" size={10} className="group-hover:translate-x-1 transition-transform" />
                                </button>
                            </div>
                        </div>
                    </PopoverContent>
                
            </Popover>

            <SearchHelpDialog open={isHelpOpen} onOpenChange={setIsHelpOpen} />
        </div>
    );
};
