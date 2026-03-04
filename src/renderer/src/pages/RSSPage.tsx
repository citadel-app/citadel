import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FeedList } from '../components/rss/FeedList';
import { FeedView } from '../components/rss/FeedView';
import { AddFeedDialog } from '../components/rss/AddFeedDialog';
import { SplitPaneLayout } from '../components/layout/SplitPaneLayout';
import { useAppSettings } from '../context/AppSettingsContext';
import { Panel, Group, Separator } from 'react-resizable-panels';
import { Icon } from '../components/IconRegistry';
import { cn } from '../lib/utils';

export const RSSPage = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const { settings } = useAppSettings();
    const isZen = settings?.zenMode;
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    const toggleSidebar = () => setIsSidebarCollapsed(!isSidebarCollapsed);

    const selectedFeedId = searchParams.get('feedId');
    const selectedItemId = searchParams.get('itemId');

    const handleSelectFeed = (id: string | null) => {
        const newParams = new URLSearchParams(searchParams);
        if (id) {
            newParams.set('feedId', id);
        } else {
            newParams.delete('feedId');
        }
        newParams.delete('itemId'); // Clear item when changing feed
        setSearchParams(newParams);
    };

    return (
        <div className="h-full w-full overflow-hidden bg-background">
            <Group orientation="horizontal" className="h-full">
                {!isSidebarCollapsed && !isZen && (
                    <Panel
                        defaultSize={250}
                        minSize={150}
                        maxSize={500}
                        className="flex flex-col bg-muted/5"
                    >
                        <FeedList
                            selectedFeedId={selectedFeedId}
                            onSelectFeed={handleSelectFeed}
                            onAddFeed={() => setIsAddDialogOpen(true)}
                            onToggleSidebar={toggleSidebar}
                        />
                    </Panel>
                )}

                {!isSidebarCollapsed && !isZen && (
                    <Separator className="w-1 bg-border/20 hover:bg-primary/50 transition-colors cursor-col-resize relative z-10">
                        <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-[2px] bg-border/50 group-hover:bg-primary transition-colors" />
                    </Separator>
                )}

                <Panel className="flex flex-col min-h-0 bg-background relative overflow-hidden">
                    {isSidebarCollapsed && (
                        <button
                            onClick={toggleSidebar}
                            className="absolute left-0 top-14 z-50 p-1.5 rounded-r-lg bg-primary text-primary-foreground shadow-md hover:pl-3 transition-all animate-in slide-in-from-left duration-300 group"
                            title="Expand Sidebar"
                        >
                            <Icon name="ChevronRight" size={16} className="group-hover:scale-110 transition-transform" />
                        </button>
                    )}
                    <FeedView selectedFeedId={selectedFeedId} initialItemId={selectedItemId} />
                </Panel>
            </Group>

            <AddFeedDialog
                open={isAddDialogOpen}
                onOpenChange={setIsAddDialogOpen}
            />
        </div>
    );
};
