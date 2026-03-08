import { useState, useEffect, useRef } from 'react';
import { Icon } from './IconRegistry';
import { InlineEntrySelector } from './InlineEntrySelector';
import { InlineSearchIntellisense } from '../search/components/InlineSearchIntellisense';
import { useSearchIntellisense } from '../search/hooks/useSearchIntellisense';
import { cn } from '../lib/utils';
import { CodexEntry } from '../lib/db';

interface ChatInputProps {
    onSearch: (query: string) => void;
    isSearching: boolean;
    onAttachContext?: () => void;
    hasContext?: boolean;
    placeholder?: string;
    className?: string;
    variant?: 'empty' | 'chat';
    initialValue?: string;
    isOffline?: boolean;
    onSelectMention?: (entry: CodexEntry, query: string, triggerIndex: number) => void;
}

export const ChatInput = ({
    onSearch,
    isSearching,
    onAttachContext,
    hasContext,
    placeholder,
    className,
    variant = 'chat',
    initialValue = '',
    isOffline,
    onSelectMention
}: ChatInputProps) => {
    const [value, setValue] = useState(initialValue);
    const [mentionQuery, setMentionQuery] = useState<string | null>(null);
    const [mentionActiveIndex, setMentionActiveIndex] = useState(0);
    const [mentionTriggerIndex, setMentionTriggerIndex] = useState(-1);
    const [pendingMentionSelect, setPendingMentionSelect] = useState(false);

    const [cursorPos, setCursorPos] = useState(-1);
    const [searchIntellisenseIndex, setSearchIntellisenseIndex] = useState(0);
    const [showSearchIntellisense, setShowSearchIntellisense] = useState(false);

    const inputRef = useRef<HTMLInputElement>(null);

    const { suggestions, range } = useSearchIntellisense(isOffline ? value : '', cursorPos);

    useEffect(() => {
        setValue(initialValue);
    }, [initialValue]);

    const handleInputChange = (val: string) => {
        setValue(val);

        if (isOffline) {
            setShowSearchIntellisense(true);
            setSearchIntellisenseIndex(0);
        }

        // Detect @ mention trigger
        const lastAtPos = val.lastIndexOf('@');

        if (lastAtPos !== -1) {
            // Check if @ is at start or after space
            if (lastAtPos === 0 || val[lastAtPos - 1] === ' ') {
                const query = val.slice(lastAtPos + 1);
                // Ensure no spaces in query (mentions end at space)
                if (!query.includes(' ')) {
                    setMentionQuery(query);
                    setMentionTriggerIndex(lastAtPos);
                    return;
                }
            }
        }

        setMentionQuery(null);
        setMentionTriggerIndex(-1);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (mentionQuery !== null) {
            // ... (existing mention logic) ...
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setMentionActiveIndex(prev => prev + 1);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setMentionActiveIndex(prev => Math.max(0, prev - 1));
            } else if (e.key === 'Enter') {
                e.preventDefault();
                setPendingMentionSelect(true);
            } else if (e.key === 'Escape') {
                setMentionQuery(null);
                setMentionTriggerIndex(-1);
            }
            return;
        }

        if (isOffline && showSearchIntellisense && suggestions.length > 0) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSearchIntellisenseIndex(prev => (prev + 1) % suggestions.length);
                return;
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSearchIntellisenseIndex(prev => (prev - 1 + suggestions.length) % suggestions.length);
                return;
            } else if (e.key === 'Enter' || e.key === 'Tab') {
                if (suggestions[searchIntellisenseIndex]) {
                    e.preventDefault();
                    handleSelectSuggestion(suggestions[searchIntellisenseIndex]);
                    return;
                }
            } else if (e.key === 'Escape') {
                setShowSearchIntellisense(false);
                return;
            }
        }

        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (value.trim() && !isSearching) {
                onSearch(value);
                setValue('');
                setShowSearchIntellisense(false);
            }
        }
    };

    const handleSelectSuggestion = (suggestion: any) => {
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

        setValue(newQuery);

        const newPos = range.start + insertText.length;
        setTimeout(() => {
            if (inputRef.current) {
                inputRef.current.focus();
                inputRef.current.setSelectionRange(newPos, newPos);
                setCursorPos(newPos);
            }
        }, 0);

        setShowSearchIntellisense(false);
    };

    const updateCursorPos = (e: React.SyntheticEvent<HTMLInputElement>) => {
        const pos = e.currentTarget.selectionStart;
        if (pos !== null) setCursorPos(pos);
    };

    const handleSelect = (entry: CodexEntry) => {
        onSelectMention(entry, mentionQuery || '', mentionTriggerIndex);
        setMentionQuery(null);
        setMentionTriggerIndex(-1);
        // Note: HomePage will update searchQuery state which will be synced back via initialValue prop
    };

    if (variant === 'empty') {
        return (
            <div className={cn("relative group w-full", className)}>
                <div className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors">
                    <Icon name="Search" size={24} />
                </div>
                <input
                    ref={inputRef}
                    type="text"
                    autoFocus
                    value={value}
                    onChange={(e) => handleInputChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onKeyUp={updateCursorPos}
                    onSelect={updateCursorPos}
                    onClick={updateCursorPos}
                    onFocus={() => isOffline && setShowSearchIntellisense(true)}
                    onBlur={() => setTimeout(() => setShowSearchIntellisense(false), 200)}
                    placeholder={placeholder || (isOffline ? "Search the Archives..." : "What are we building today?")}
                    className="w-full h-16 pl-16 pr-32 rounded-3xl border border-border bg-card focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none text-xl transition-all shadow-xl hover:shadow-2xl"
                />
                {mentionQuery !== null && (
                    <InlineEntrySelector
                        query={mentionQuery}
                        activeIndex={mentionActiveIndex}
                        onSelectIndexChange={(idx) => setMentionActiveIndex(idx)}
                        onSelect={handleSelect}
                        pendingSelect={pendingMentionSelect}
                        onSelectionProcessed={() => setPendingMentionSelect(false)}
                    />
                )}
                {isOffline && showSearchIntellisense && suggestions.length > 0 && (
                    <InlineSearchIntellisense
                        suggestions={suggestions}
                        selectedIndex={searchIntellisenseIndex}
                        onSelectIndexChange={(idx) => setSearchIntellisenseIndex(idx)}
                        onSelect={handleSelectSuggestion}
                    />
                )}
                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-3">
                    {onAttachContext && (
                        <button
                            onClick={onAttachContext}
                            className={cn(
                                "p-3 rounded-2xl border border-border transition-all hover:bg-muted",
                                hasContext ? "bg-primary/10 border-primary/30 text-primary" : "text-muted-foreground font-bold"
                            )}
                            title="Attach Context"
                        >
                            <Icon name="Paperclip" size={20} />
                        </button>
                    )}
                    <button
                        onClick={() => { onSearch(value); setValue(''); setShowSearchIntellisense(false); }}
                        disabled={isSearching || !value.trim()}
                        className="px-6 h-12 bg-primary text-primary-foreground rounded-2xl hover:bg-primary/90 transition-all disabled:opacity-50 font-bold flex items-center gap-2 shadow-lg"
                    >
                        <span>{isOffline ? 'Browse' : 'Search'}</span>
                        <Icon name={isOffline ? 'Library' : 'ArrowRight'} size={18} />
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={cn("relative w-full", className)}>
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                <Icon name="Search" size={20} />
            </div>
            <input
                ref={inputRef}
                type="text"
                value={value}
                onChange={(e) => handleInputChange(e.target.value)}
                onKeyDown={handleKeyDown}
                onKeyUp={updateCursorPos}
                onSelect={updateCursorPos}
                onClick={updateCursorPos}
                onFocus={() => isOffline && setShowSearchIntellisense(true)}
                onBlur={() => setTimeout(() => setShowSearchIntellisense(false), 200)}
                placeholder={placeholder || (isOffline ? "Search the Archives..." : "Ask a follow-up or a new question...")}
                className="w-full h-12 pl-12 pr-28 rounded-2xl border border-border bg-background focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-base transition-all shadow-md"
            />
            {mentionQuery !== null && (
                <InlineEntrySelector
                    query={mentionQuery}
                    activeIndex={mentionActiveIndex}
                    onSelectIndexChange={(idx) => setMentionActiveIndex(idx)}
                    onSelect={handleSelect}
                    pendingSelect={pendingMentionSelect}
                    onSelectionProcessed={() => setPendingMentionSelect(false)}
                />
            )}
            {isOffline && showSearchIntellisense && suggestions.length > 0 && (
                <InlineSearchIntellisense
                    suggestions={suggestions}
                    selectedIndex={searchIntellisenseIndex}
                    onSelectIndexChange={(idx) => setSearchIntellisenseIndex(idx)}
                    onSelect={handleSelectSuggestion}
                />
            )}
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                <button
                    onClick={() => { onSearch(value); setValue(''); setShowSearchIntellisense(false); }}
                    disabled={isSearching || !value.trim()}
                    className="p-2 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                    <Icon name="ArrowUp" size={18} />
                </button>
                {onAttachContext && (
                    <button
                        onClick={onAttachContext}
                        className={cn(
                            "p-2 rounded-xl border border-border transition-all hover:bg-muted",
                            hasContext ? "bg-primary/10 border-primary/30 text-primary" : "text-muted-foreground"
                        )}
                        title="Attach Context"
                    >
                        <Icon name="Paperclip" size={18} />
                    </button>
                )}
            </div>
        </div>
    );
};
