import { ReactNode, createContext, useContext, useState } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { Icon } from '../IconRegistry';
import { cn } from '../../lib/utils';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuGroup, DropdownMenuLabel, DropdownMenuItem, DropdownMenuSeparator } from '../ui/dropdown-menu';

export type SplitOrientation = 'horizontal' | 'vertical';
export type ActivePanel = 'both' | 'left' | 'right';

export interface SplitPaneContextType {
    splitOrientation: SplitOrientation;
    setSplitOrientation: (orientation: SplitOrientation) => void;
    activePanel: ActivePanel;
    setActivePanel: (panel: ActivePanel) => void;
}

const SplitPaneContext = createContext<SplitPaneContextType | undefined>(undefined);

export const useSplitPane = () => {
    const context = useContext(SplitPaneContext);
    if (!context) throw new Error('useSplitPane must be used within SplitPaneProvider');
    return context;
};

export const SplitPaneProvider = ({
    children,
    defaultOrientation = 'horizontal',
    defaultActive = 'both',
    controlledContext 
}: { 
    children: ReactNode, 
    defaultOrientation?: SplitOrientation, 
    defaultActive?: ActivePanel,
    controlledContext?: SplitPaneContextType
}) => {
    const [splitOrientation, setSplitOrientation] = useState<SplitOrientation>(defaultOrientation);
    const [activePanel, setActivePanel] = useState<ActivePanel>(defaultActive);

    const value = controlledContext || {
        splitOrientation,
        setSplitOrientation,
        activePanel,
        setActivePanel
    };

    return (
        <SplitPaneContext.Provider value={value}>
            {children}
        </SplitPaneContext.Provider>
    );
};

interface LayoutControlsProps {
    className?: string;
    floating?: boolean;
}

export const SplitPaneControls = ({ className, floating = true }: LayoutControlsProps) => {
    const { splitOrientation, setSplitOrientation, activePanel, setActivePanel } = useSplitPane();

    return (
        <div className={cn(
            "flex items-center gap-0.5",
            floating ? "p-1 rounded-md bg-background/80 backdrop-blur border border-border shadow-sm" : "",
            className
        )}>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <button
                        className={cn(
                            "h-7 flex items-center gap-1.5 px-2 rounded-md transition-all text-xs font-bold",
                            "hover:bg-muted text-muted-foreground hover:text-foreground",
                            "data-[state=open]:bg-muted data-[state=open]:text-foreground"
                        )}
                        title="Change Layout"
                    >
                        <Icon name="Columns" size={14} />
                    </button>
                </DropdownMenuTrigger>

                <DropdownMenuContent
                    className="min-w-[180px] z-[100]"
                    align="end"
                    sideOffset={5}
                >
                    <DropdownMenuGroup>
                        <DropdownMenuLabel className="px-2 py-1.5 text-[10px] uppercase tracking-widest text-muted-foreground/50">
                            Visible Panels
                        </DropdownMenuLabel>

                        <DropdownMenuItem
                            onSelect={() => setActivePanel('left')}
                            className={cn(
                                "flex items-center gap-2",
                                activePanel === 'left' && "bg-primary/10 text-primary"
                            )}
                        >
                            <span>Primary Panel</span>
                        </DropdownMenuItem>

                        <DropdownMenuItem
                            onSelect={() => setActivePanel('right')}
                            className={cn(
                                "flex items-center gap-2",
                                activePanel === 'right' && "bg-primary/10 text-primary"
                            )}
                        >
                            <span>Secondary Panel</span>
                        </DropdownMenuItem>

                        <DropdownMenuItem
                            onSelect={() => setActivePanel('both')}
                            className={cn(
                                "flex items-center gap-2",
                                activePanel === 'both' && "bg-primary/10 text-primary"
                            )}
                        >
                            <span>Both</span>
                        </DropdownMenuItem>
                    </DropdownMenuGroup>

                    <DropdownMenuSeparator />

                    <DropdownMenuGroup>
                        <DropdownMenuLabel className="px-2 py-1.5 text-[10px] uppercase tracking-widest text-muted-foreground/50">
                            Split Orientation
                        </DropdownMenuLabel>

                        <DropdownMenuItem
                            onSelect={() => {
                                setSplitOrientation('vertical');
                                setActivePanel('both');
                            }}
                            className={cn(
                                "flex items-center gap-2",
                                splitOrientation === 'vertical' && "bg-primary/10 text-primary font-bold"
                            )}
                        >
                            <Icon name="Columns" size={14} />
                            <span>Vertical (Columns)</span>
                        </DropdownMenuItem>

                        <DropdownMenuItem
                            onSelect={() => {
                                setSplitOrientation('horizontal');
                                setActivePanel('both');
                            }}
                            className={cn(
                                "flex items-center gap-2",
                                splitOrientation === 'horizontal' && "bg-primary/10 text-primary font-bold"
                            )}
                        >
                            <Icon name="Rows" size={14} />
                            <span>Horizontal (Rows)</span>
                        </DropdownMenuItem>
                    </DropdownMenuGroup>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
};

interface SplitPaneLayoutProps {
    leftPanel: ReactNode;
    rightPanel: ReactNode;
    defaultLeftSize?: number;
    minSize?: number;
    showLayoutControls?: boolean;
    controlsPosition?: 'top-left' | 'top-right';
    className?: string;
}

export const SplitPaneLayout = ({
    leftPanel,
    rightPanel,
    defaultLeftSize = 50,
    minSize = 20,
    showLayoutControls = false,
    controlsPosition = 'top-right',
    className
}: SplitPaneLayoutProps) => {
    const { splitOrientation, activePanel } = useSplitPane();

    if (activePanel === 'left') {
        return (
            <div className={cn("h-full w-full relative group/layout", className)}>
                {showLayoutControls && (
                    <div className={cn(
                        "absolute top-2 z-50 transition-opacity opacity-0 group-hover/layout:opacity-100",
                        controlsPosition === 'top-right' ? 'right-4' : 'left-4'
                    )}>
                        <SplitPaneControls />
                    </div>
                )}
                <div className="h-full w-full flex flex-col min-h-0">
                    {leftPanel}
                </div>
            </div>
        );
    }

    if (activePanel === 'right') {
        return (
            <div className={cn("h-full w-full relative group/layout", className)}>
                {showLayoutControls && (
                    <div className={cn(
                        "absolute top-2 z-50 transition-opacity opacity-0 group-hover/layout:opacity-100",
                        controlsPosition === 'top-right' ? 'right-4' : 'left-4'
                    )}>
                        <SplitPaneControls />
                    </div>
                )}
                <div className="h-full w-full flex flex-col min-h-0">
                    {rightPanel}
                </div>
            </div>
        );
    }

    return (
        <div className={cn("h-full flex flex-col relative group/layout", className)}>
            {/* Floating Layout Controls */}
            {showLayoutControls && (
                <div className={cn(
                    "absolute top-2 z-50 transition-opacity opacity-0 group-hover/layout:opacity-100",
                    controlsPosition === 'top-right' ? 'right-4' : 'left-4'
                )}>
                    <SplitPaneControls />
                </div>
            )}

            <PanelGroup orientation={splitOrientation} className="h-full">
                {/* Left/Top Panel */}
                <Panel defaultSize={defaultLeftSize} minSize={minSize}>
                    <div className="h-full flex flex-col min-h-0">
                        {leftPanel}
                    </div>
                </Panel>

                <PanelResizeHandle
                    className={cn(
                        "bg-border hover:bg-primary/50 transition-colors z-10",
                        splitOrientation === 'vertical'
                            ? 'h-1 w-full cursor-row-resize'
                            : 'w-1 h-full cursor-col-resize'
                    )}
                />

                {/* Right/Bottom Panel */}
                <Panel defaultSize={100 - defaultLeftSize} minSize={minSize}>
                    <div className="h-full flex flex-col min-h-0">
                        {rightPanel}
                    </div>
                </Panel>
            </PanelGroup>
        </div>
    );
};
