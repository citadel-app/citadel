import { Icon, cn } from '@citadel-app/ui';
import { SearchInput } from '../../search';

interface EntryBrowserFiltersProps {
    typeFilter: string;
    setTypeFilter: (type: string) => void;
    universalQuery: string;
    setUniversalQuery: (query: string) => void;
    entryTypes: string[];
    onClear: () => void;
    className?: string;
    isZen?: boolean;
}

export const EntryBrowserFilters = ({
    typeFilter,
    universalQuery,
    setUniversalQuery,
    onClear,
    className,
    isZen
}: EntryBrowserFiltersProps) => {
    const hasActiveFilters = typeFilter !== 'all' || universalQuery;

    return (
        <div className={cn(
            "flex flex-wrap items-end gap-4 p-4 transition-all duration-500",
            isZen ? "bg-transparent border-none p-0" : "bg-muted/30 border-b border-border",
            className
        )}>
            {/* Universal Search Input */}
            <div className="flex flex-col gap-1.5 flex-1 min-w-[300px]">
                {!isZen && (
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">
                        Search
                    </label>
                )}
                <SearchInput
                    value={universalQuery}
                    onChange={setUniversalQuery}
                    onClear={() => setUniversalQuery('')}
                    placeholder='Try: #"Tag" AND (companies:Amazon OR companies:Google)'
                    className="w-full"
                />
            </div>

            {/* Clear Filters */}
            {hasActiveFilters && (
                <button
                    onClick={onClear}
                    className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors border border-dashed border-border rounded-lg h-[38px] bg-background shadow-sm"
                >
                    <Icon name="X" size={12} />
                    Clear
                </button>
            )}
        </div>
    );
};
