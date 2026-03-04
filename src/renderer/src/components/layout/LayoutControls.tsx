import { useLayout } from '../../context/LayoutContext';
import { Icon } from '../IconRegistry';
import { cn } from '../../lib/utils';

interface LayoutControlsProps {
    className?: string;
    floating?: boolean;
}

export const LayoutControls = ({ className, floating = true }: LayoutControlsProps) => {
    const { splitOrientation, setSplitOrientation, activePanel, setActivePanel } = useLayout();
    return (
        <div className={cn(
            "flex items-center gap-0.5", // Reduced gap
            floating ? "p-1 rounded-md bg-background/80 backdrop-blur border border-border shadow-sm" : "",
            className
        )}>
            {/* Left Panel Toggle */}
            <button
                onClick={() => setActivePanel(activePanel === 'left' ? 'both' : 'left')}
                className={cn(
                    "h-6 w-6 flex items-center justify-center rounded-sm transition-colors", // Fixed size 24px
                    activePanel === 'left'
                        ? 'bg-primary/20 text-primary'
                        : 'text-muted-foreground/70 hover:text-foreground hover:bg-muted'
                )}
                title={activePanel === 'left' ? "Restore Split View" : "Maximize Left Panel"}
            >
                <Icon name={splitOrientation == 'vertical' ? "LucidePanelBottomClose" : "LucidePanelRightClose"} size={14} />
            </button>

            {/* <div className={cn("w-px h-3 bg-border/40 mx-1", floating ? "bg-border/50 h-4" : "")} /> */}

            {/* Split Toggles */}
            {
                splitOrientation === 'horizontal' &&
                <button
                    onClick={() => {
                        setSplitOrientation('vertical');
                        setActivePanel('both');
                    }}
                    className={cn(
                        "h-6 w-6 flex items-center justify-center rounded-sm transition-colors",
                        activePanel === 'both'
                            ? 'bg-primary/20 text-primary'
                            : 'text-muted-foreground/70 hover:text-foreground hover:bg-muted'
                    )}
                    title="Columns (Side-by-Side)"
                >
                    <Icon name="Columns" size={14} />
                </button>
            }
            {
                splitOrientation === 'vertical' &&
                <button
                    onClick={() => {
                        setSplitOrientation('horizontal');
                        setActivePanel('both');
                    }}
                    className={cn(
                        "h-6 w-6 flex items-center justify-center rounded-sm transition-colors",
                        activePanel === 'both'
                            ? 'bg-primary/20 text-primary'
                            : 'text-muted-foreground/70 hover:text-foreground hover:bg-muted'
                    )}
                    title="Rows (Top-Bottom)"
                >
                    <Icon name="Rows" size={14} />
                </button>
            }
            {/* <div className={cn("w-px h-3 bg-border/40 mx-1", floating ? "bg-border/50 h-4" : "")} /> */}

            {/* Right Panel Toggle */}
            <button
                onClick={() => setActivePanel(activePanel === 'right' ? 'both' : 'right')}
                className={cn(
                    "h-6 w-6 flex items-center justify-center rounded-sm transition-colors",
                    activePanel === 'right'
                        ? 'bg-primary/20 text-primary'
                        : 'text-muted-foreground/70 hover:text-foreground hover:bg-muted'
                )}
                title={activePanel === 'right' ? "Restore Split View" : "Maximize Right Panel"}
            >
                <Icon name={splitOrientation == 'vertical' ? "LucidePanelTopClose" : "LucidePanelLeftClose"} size={14} />
            </button>
        </div>
    );
};
