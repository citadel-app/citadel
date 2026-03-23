import React, { memo, useMemo } from 'react';
import { VariableSizeList as List } from 'react-window';
import { Icon } from '../../index';
import { cn } from '../../index';

export type GitItem =
    | { type: 'header'; id: string; label: string; count: number; isCollapsed?: boolean; onToggle?: () => void; onBulkAction?: (e: React.MouseEvent) => void; bulkActionIcon?: string; bulkActionTitle?: string; secondaryBulkActionIcon?: string; secondaryBulkActionTitle?: string; onSecondaryBulkAction?: (e: React.MouseEvent) => void; }
    | { type: 'file'; id: string; path: string; index: string; working_dir: string; section: 'index' | 'working_dir'; };

interface RowData {
    items: GitItem[];
    onSelect: (file: { path: string, status: 'index' | 'working_dir', gitStatus: string }) => void;
    selectedFile: { path: string, status: 'index' | 'working_dir' } | null;
    onAction?: (file: string, e: React.MouseEvent) => void;
    actionIcon?: (section: 'index' | 'working_dir') => string;
    actionTitle?: (section: 'index' | 'working_dir') => string;
    onSecondaryAction?: (file: string, e: React.MouseEvent) => void;
    secondaryActionIcon?: (section: 'index' | 'working_dir') => string;
    secondaryActionTitle?: (section: 'index' | 'working_dir') => string;
}

const GitRow = memo((props: {
    index: number;
    style: React.CSSProperties;
    data: RowData;
}) => {
    const {
        index,
        style,
        data
    } = props;

    const {
        items,
        onSelect,
        selectedFile,
        onAction,
        actionIcon,
        actionTitle,
        onSecondaryAction,
        secondaryActionIcon,
        secondaryActionTitle
    } = data;

    const item = items[index];
    if (!item) return null;

    if (item.type === 'header') {
        return (
            <div
                style={style}
                className="flex items-center justify-between px-4 py-2 border-y border-border/40 bg-muted/10 select-none cursor-pointer hover:bg-muted/20 transition-colors"
                onClick={item.onToggle}
            >
                <div className="flex items-center gap-2 text-foreground">
                    <Icon
                        name="ChevronRight"
                        size={12}
                        className={cn("text-muted-foreground transition-transform", !item.isCollapsed && "rotate-90")}
                    />
                    <span className="text-[10px] font-bold uppercase tracking-wider">{item.label}</span>
                    <span className={cn(
                        "px-1.5 rounded-full text-[9px] min-w-[18px] text-center",
                        item.label.toLowerCase().includes('staged') ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground font-medium"
                    )}>
                        {item.count}
                    </span>
                </div>
                <div className="flex items-center gap-1">
                    {item.onSecondaryBulkAction && item.secondaryBulkActionIcon && (
                        <button
                            onClick={item.onSecondaryBulkAction}
                            className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-destructive transition-colors"
                            title={item.secondaryBulkActionTitle}
                        >
                            <Icon name={item.secondaryBulkActionIcon} size={12} />
                        </button>
                    )}
                    {item.onBulkAction && item.bulkActionIcon && (
                        <button
                            onClick={item.onBulkAction}
                            className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"
                            title={item.bulkActionTitle}
                        >
                            <Icon name={item.bulkActionIcon} size={12} />
                        </button>
                    )}
                </div>
            </div>
        );
    }

    const { path, index: idx, working_dir, section } = item;
    const gitStatus = section === 'index' ? idx : working_dir;
    const isSelected = selectedFile?.path === path && selectedFile?.status === section;

    return (
        <div style={style}>
            <div
                className={cn(
                    "group flex items-center justify-between p-2 hover:bg-muted/50 rounded text-sm cursor-pointer mx-2 my-0.5 transition-colors",
                    isSelected && "bg-muted shadow-sm ring-1 ring-border/50"
                )}
                onClick={() => onSelect({ path, status: section, gitStatus })}
            >
                <div className="flex items-center gap-2 truncate flex-1">
                    <span className={cn(
                        "text-[10px] font-mono px-1.5 py-0.5 rounded min-w-[20px] text-center",
                        section === 'index' ? "bg-green-500/10 text-green-500" : (
                            gitStatus === '?' ? 'bg-green-500/10 text-green-500' :
                                gitStatus === 'M' ? 'bg-blue-500/10 text-blue-500' :
                                    gitStatus === 'D' ? 'bg-red-500/10 text-red-500' : 'bg-muted text-muted-foreground'
                        )
                    )}>
                        {gitStatus === '?' ? 'U' : gitStatus}
                    </span>
                    <span className="truncate text-xs font-medium text-foreground" title={path}>{path}</span>
                </div>

                <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 shrink-0 ml-2">
                    {onSecondaryAction && secondaryActionIcon && secondaryActionIcon(section) && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onSecondaryAction(path, e); }}
                            className="p-1 hover:bg-background rounded border border-border/50 hover:text-destructive transition-colors bg-muted/30"
                            title={secondaryActionTitle?.(section)}
                        >
                            <Icon name={secondaryActionIcon(section)} size={12} />
                        </button>
                    )}
                    {onAction && actionIcon && actionIcon(section) && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onAction(path, e); }}
                            className="p-1 hover:bg-background rounded border border-border/50 hover:text-primary transition-colors bg-muted/30"
                            title={actionTitle?.(section)}
                        >
                            <Icon name={actionIcon(section)} size={12} />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
});

interface VirtualizedFileListProps {
    items: GitItem[];
    height: number;
    onSelect: (file: { path: string, status: 'index' | 'working_dir', gitStatus: string }) => void;
    selectedFile: { path: string, status: 'index' | 'working_dir' } | null;
    onAction?: (file: string, e: React.MouseEvent) => void;
    actionIcon?: (section: 'index' | 'working_dir') => string;
    actionTitle?: (section: 'index' | 'working_dir') => string;
    onSecondaryAction?: (file: string, e: React.MouseEvent) => void;
    secondaryActionIcon?: (section: 'index' | 'working_dir') => string;
    secondaryActionTitle?: (section: 'index' | 'working_dir') => string;
}

export const VirtualizedFileList: React.FC<VirtualizedFileListProps> = (props) => {
    const { items = [], height } = props;

    // Provide stable data object for row memoization
    const rowData: RowData = useMemo(() => {
        const { items: _, height: __, ...rest } = props;
        return {
            items,
            ...rest
        };
    }, [items, props.onSelect, props.selectedFile, props.onAction, props.onSecondaryAction]);

    const getItemSize = (index: number) => {
        return items[index]?.type === 'header' ? 32 : 36;
    };

    // Ensure we handle height 0 or other edge cases
    if (height <= 0) return null;

    return (
        <List
            height={height}
            width="100%"
            itemCount={items.length}
            itemSize={getItemSize}
            itemData={rowData}
            children={GitRow as any}
            className="scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent outline-none overflow-x-hidden"
        />
    );
};
