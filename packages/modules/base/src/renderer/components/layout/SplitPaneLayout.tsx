import { ReactNode } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { useLayout } from '../../context/LayoutContext';
import { LayoutControls } from './LayoutControls';
import { cn } from '@citadel-app/ui';

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
    const { splitOrientation, activePanel } = useLayout();

    if (activePanel === 'left') {
        return (
            <div className={cn("h-full w-full relative group/layout", className)}>
                {showLayoutControls && (
                    <div className={cn(
                        "absolute top-2 z-50 transition-opacity opacity-0 group-hover/layout:opacity-100",
                        controlsPosition === 'top-right' ? 'right-4' : 'left-4'
                    )}>
                        <LayoutControls />
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
                        <LayoutControls />
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
                    <LayoutControls />
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
