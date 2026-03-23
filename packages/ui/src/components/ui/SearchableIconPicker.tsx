import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Icon, LUCIDE_ICON_NAMES } from '../IconRegistry';
import { Search, Check, X } from 'lucide-react';
import { Button } from './button';
import { cn } from '../../lib/utils';
import { useDebounce } from '../../hooks/useDebounce';

interface SearchableIconPickerProps {
    value: string;
    onChange: (iconName: string) => void;
    className?: string;
}

const ITEMS_PER_PAGE = 100;

export const SearchableIconPicker = ({ value, onChange, className }: SearchableIconPickerProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const debouncedSearch = useDebounce(search, 300);
    const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
    const containerRef = useRef<HTMLDivElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    const filteredIcons = useMemo(() => {
        if (!debouncedSearch) return LUCIDE_ICON_NAMES;
        const s = debouncedSearch.toLowerCase();
        return LUCIDE_ICON_NAMES.filter(name =>
            name.toLowerCase().includes(s)
        );
    }, [debouncedSearch]);

    const visibleIcons = useMemo(() => {
        return filteredIcons.slice(0, visibleCount);
    }, [filteredIcons, visibleCount]);

    // Reset visible count when search changes
    useEffect(() => {
        setVisibleCount(ITEMS_PER_PAGE);
        if (listRef.current) listRef.current.scrollTop = 0;
    }, [debouncedSearch]);

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
        if (scrollHeight - scrollTop <= clientHeight + 50) {
            if (visibleCount < filteredIcons.length) {
                setVisibleCount(prev => prev + ITEMS_PER_PAGE);
            }
        }
    };

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    return (
        <div className={cn("relative", className)} ref={containerRef}>
            <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex justify-between font-normal text-sm"
            >
                <div className="flex items-center gap-2">
                    <Icon name={value} size={16} className="text-primary text-muted-foreground shrink-0" />
                    <span className="truncate">{value}</span>
                </div>
                <Icon name="ChevronDown" size={14} className="text-muted-foreground opacity-50 shrink-0" />
            </Button>

            {isOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-popover border border-border rounded-lg shadow-xl animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[400px]">
                    <div className="p-2 border-b border-border text-popover-foreground flex items-center gap-2">
                        <Search size={14} className="text-muted-foreground shrink-0" />
                        <input
                            autoFocus
                            type="text"
                            placeholder="Search icons..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="flex-1 bg-transparent border-none outline-none text-xs h-7"
                        />
                        {search && (
                            <Button
                                variant="ghost"
                                size="icon-xs"
                                onClick={() => setSearch('')}
                                className="h-6 w-6 text-muted-foreground"
                            >
                                <X size={12} />
                            </Button>
                        )}
                    </div>

                    <div
                        ref={listRef}
                        onScroll={handleScroll}
                        className="overflow-y-auto p-2 grid grid-cols-6 gap-1 scrollbar-thin overflow-x-hidden"
                    >
                        {visibleIcons.map(iconName => (
                            <Button
                                key={iconName}
                                type="button"
                                variant="ghost"
                                title={iconName}
                                onClick={() => {
                                    onChange(iconName);
                                    setIsOpen(false);
                                }}
                                className={cn(
                                    "h-10 w-full flex flex-col items-center justify-center relative p-0 group",
                                    value === iconName ? "bg-primary/20 text-primary hover:bg-primary/30" : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <Icon name={iconName} size={20} />
                                {value === iconName && (
                                    <div className="absolute -top-1 -right-1 bg-primary text-primary-foreground rounded-full p-0.5 shadow-sm">
                                        <Check size={8} />
                                    </div>
                                )}
                            </Button>
                        ))}
                        {visibleIcons.length === 0 && (
                            <div className="col-span-6 py-8 text-center text-xs text-muted-foreground">
                                No icons found for "{search}"
                            </div>
                        )}
                    </div>

                    <div className="p-2 border-t border-border bg-muted/30 text-[10px] text-muted-foreground flex justify-between items-center">
                        <span>Showing {visibleIcons.length} of {filteredIcons.length} icons</span>
                        {filteredIcons.length > visibleCount && <span>Scroll for more...</span>}
                    </div>
                </div>
            )}
        </div>
    );
};
