import { useLayout } from '../../context/LayoutContext';
import { Icon } from '@citadel-app/ui';
import { cn } from '@citadel-app/ui';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

interface LayoutControlsProps {
    className?: string;
    floating?: boolean;
}

export const LayoutControls = ({ className, floating = true }: LayoutControlsProps) => {
    const { splitOrientation, setSplitOrientation, activePanel, setActivePanel } = useLayout();

    return (
        <div className={cn(
            "flex items-center gap-0.5",
            floating ? "p-1 rounded-md bg-background/80 backdrop-blur border border-border shadow-sm" : "",
            className
        )}>
            <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                    <button
                        className={cn(
                            "h-7 flex items-center gap-1.5 px-2 rounded-md transition-all text-xs font-bold",
                            "hover:bg-muted text-muted-foreground hover:text-foreground",
                            "data-[state=open]:bg-muted data-[state=open]:text-foreground"
                        )}
                        title="Change Layout"
                    >
                        <Icon name="Columns" size={14} />
                        {/* <span className="hidden sm:inline">Layout</span> */}
                    </button>
                </DropdownMenu.Trigger>

                <DropdownMenu.Portal>
                    <DropdownMenu.Content
                        className="min-w-[180px] bg-background text-popover-foreground rounded-md border border-border shadow-md p-1 z-[100] animate-in fade-in-0 zoom-in-95"
                        align="end"
                        sideOffset={5}
                    >
                        <DropdownMenu.Group>
                            <DropdownMenu.Label className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
                                Visible Panels
                            </DropdownMenu.Label>

                            <DropdownMenu.Item
                                onSelect={() => setActivePanel('left')}
                                className={cn(
                                    "flex items-center gap-2 px-2 py-1.5 text-sm outline-none cursor-pointer rounded-sm hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
                                    activePanel === 'left' && "bg-primary/10 text-primary"
                                )}
                            >
                                <span>Primary Panel</span>
                            </DropdownMenu.Item>

                            <DropdownMenu.Item
                                onSelect={() => setActivePanel('right')}
                                className={cn(
                                    "flex items-center gap-2 px-2 py-1.5 text-sm outline-none cursor-pointer rounded-sm hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
                                    activePanel === 'right' && "bg-primary/10 text-primary"
                                )}
                            >
                                <span>Secondary Panel</span>
                            </DropdownMenu.Item>

                            <DropdownMenu.Item
                                onSelect={() => setActivePanel('both')}
                                className={cn(
                                    "flex items-center gap-2 px-2 py-1.5 text-sm outline-none cursor-pointer rounded-sm hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
                                    activePanel === 'both' && "bg-primary/10 text-primary"
                                )}
                            >
                                <span>Both</span>
                            </DropdownMenu.Item>
                        </DropdownMenu.Group>

                        <DropdownMenu.Separator className="h-px bg-border my-1" />

                        <DropdownMenu.Group>
                            <DropdownMenu.Label className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
                                Split Orientation
                            </DropdownMenu.Label>

                            <DropdownMenu.Item
                                onSelect={() => {
                                    setSplitOrientation('vertical');
                                    setActivePanel('both');
                                }}
                                className={cn(
                                    "flex items-center gap-2 px-2 py-1.5 text-sm outline-none cursor-pointer rounded-sm hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
                                    splitOrientation === 'vertical' && "bg-primary/10 text-primary font-bold"
                                )}
                            >
                                <Icon name="Columns" size={14} />
                                <span>Vertical (Columns)</span>
                            </DropdownMenu.Item>

                            <DropdownMenu.Item
                                onSelect={() => {
                                    setSplitOrientation('horizontal');
                                    setActivePanel('both');
                                }}
                                className={cn(
                                    "flex items-center gap-2 px-2 py-1.5 text-sm outline-none cursor-pointer rounded-sm hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
                                    splitOrientation === 'horizontal' && "bg-primary/10 text-primary font-bold"
                                )}
                            >
                                <Icon name="Rows" size={14} />
                                <span>Horizontal (Rows)</span>
                            </DropdownMenu.Item>
                        </DropdownMenu.Group>
                    </DropdownMenu.Content>
                </DropdownMenu.Portal>
            </DropdownMenu.Root>
        </div>
    );
};
