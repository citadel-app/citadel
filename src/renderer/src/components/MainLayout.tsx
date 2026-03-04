import { Icon } from '../components/IconRegistry';
import { useTheme } from 'next-themes';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { StatusBar } from './layout/StatusBar';
import { TitleBar } from './TitleBar';
import { cn } from '../lib/utils';
import { useGit } from '@renderer/context/GitContext';
import { useAppSettings } from '@renderer/context/AppSettingsContext';
import { useConfig } from '@renderer/context/ConfigContext';
import { useLayout } from '@renderer/context/LayoutContext';
import { CreateEntryDialog } from './CreateEntryDialog';
import { OnboardingTour } from './OnboardingTour';
import { useEffect, useState } from 'react';

export const MainLayout = () => {
    const { theme, setTheme } = useTheme();
    const { settings, updateSetting } = useAppSettings();
    const { setVaultPath } = useConfig();
    const isZen = settings?.zenMode;

    const location = useLocation();
    const navigate = useNavigate();
    const { status } = useGit();
    const { isCreateDialogOpen, setIsCreateDialogOpen } = useLayout();

    const changedFilesCount = status?.files?.length || 0;

    // Load GitHub account for sidebar display
    const [sidebarUser, setSidebarUser] = useState<{ login: string; avatar_url: string; name: string | null } | null>(null);
    useEffect(() => {
        (async () => {
            const accountsJson = await window.api.secrets.get('github_accounts');
            const activeLogin = await window.api.secrets.get('github_active_login');
            if (accountsJson) {
                try {
                    const accounts = JSON.parse(accountsJson);
                    const active = accounts.find((a: any) => a.login === activeLogin) || accounts[0];
                    if (active) setSidebarUser({ login: active.login, avatar_url: active.avatar_url, name: active.name });
                } catch { /* ignore */ }
            }
        })();
    }, []);

    // Keyboard shortcut to toggle Zen Mode
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.ctrlKey && e.altKey && e.code === 'KeyZ') {
                updateSetting('zenMode', !isZen);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isZen, updateSetting]);

    return (
        <div className={cn(
            "flex flex-col h-screen w-screen bg-background text-foreground overflow-hidden font-sans border border-border/50 transition-colors duration-1000",
            isZen && "bg-background/95"
        )}>
            {/* Atmospheric Background (Zen Mode Only) */}
            {isZen && (
                <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
                    <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-[radial-gradient(circle_at_50%_50%,rgba(var(--primary-rgb),0.03)_0%,transparent_50%)] animate-[zen-pulse_15s_ease-in-out_infinite]" />
                    <div className="absolute bottom-[-50%] right-[-50%] w-[200%] h-[200%] bg-[radial-gradient(circle_at_50%_50%,rgba(var(--primary-rgb),0.02)_0%,transparent_40%)] animate-[zen-pulse_20s_ease-in-out_infinite_reverse]" />
                </div>
            )}

            {/* Custom Title Bar */}
            {!isZen && <TitleBar />}

            <CreateEntryDialog
                open={isCreateDialogOpen}
                onOpenChange={setIsCreateDialogOpen}
                onCreated={(e) => navigate(`/${e.type}/${e.id}`)}
            />

            {/* Main Workspace Area (Sidebar + Content) */}
            <div className="flex-1 flex overflow-hidden min-h-0">
                {/* Activity Bar (VS Code Sidebar) */}
                <aside className={cn(
                    "w-[54px] bg-muted/80 backdrop-blur-md flex flex-col items-center py-4 gap-4 z-50 border-r border-border select-none transition-all duration-700 ease-in-out transform overflow-y-auto scrollbar-none",
                    isZen ? "-translate-x-full opacity-0 h-0" : "translate-x-0 opacity-100 h-full"
                )}>
                    {/* Activity Bar Content Wrapper to handle scrolling naturally */}
                    <div className="flex flex-col items-center gap-4 w-full h-full min-h-max">
                        {/* Workspace & Logic */}
                        <nav className="flex flex-col gap-1 w-full items-center">
                            <ActivityBarItem to="/" icon="Library" title="Browser" active={location.pathname === '/'} tourId="tour-browser" />
                            <ActivityBarItem to="/notebooks" icon="Book" title="Notebook" active={location.pathname === '/notebooks'} tourId="tour-notebook" />
                            <ActivityBarItem to="/kanban" icon="Columns3" title="Kanban Board" active={location.pathname === '/kanban'} tourId="tour-kanban" />
                        </nav>

                        {/* Separator */}
                        <div className="w-6 h-[1px] bg-border/40 shrink-0" />

                        {/* Creative Suite */}
                        <nav className="flex flex-col gap-1 w-full items-center">
                            <ActivityBarItem to="/notes" icon="StickyNote" title="Quick Notes" active={location.pathname === '/notes'} />
                            <ActivityBarItem to="/editor" icon="Code" title="Code Editor" active={location.pathname === '/editor'} tourId="tour-editor" />
                            <ActivityBarItem to="/latex" icon="Sigma" title="LaTeX Editor" active={location.pathname === '/latex'} />
                            <ActivityBarItem to="/whiteboard" icon="SquarePen" title="Whiteboard" active={location.pathname === '/whiteboard'} />
                        </nav>

                        {/* Bottom Utility Icons */}
                        <div className="mt-auto flex flex-col gap-1 w-full items-center mb-2">
                            {/* Separator */}
                            <div className="w-6 h-[1px] bg-border/40 mb-2 shrink-0" />

                            {status?.files?.length > 0 && (settings && (settings.developerMode || !settings.autoCommitEnabled)) && (
                                <ActivityBarItem
                                    to="/source-control"
                                    icon="GitBranch"
                                    title="Source Control"
                                    tourId="tour-source-control"
                                    active={location.pathname === '/source-control'}
                                    badge={changedFilesCount}
                                />
                            )}

                            <div className="w-6 h-[1px] bg-border/40 my-2 shrink-0" />

                            {/* GitHub Account Avatar */}
                            {sidebarUser && (
                                <div className="mb-1" title={`${sidebarUser.name || sidebarUser.login} (@${sidebarUser.login})`}>
                                    <img src={sidebarUser.avatar_url} alt="" className="w-7 h-7 rounded-full ring-2 ring-border/50 opacity-70 hover:opacity-100 transition-opacity cursor-default" />
                                </div>
                            )}

                            <button
                                onClick={() => setVaultPath(null)}
                                className="p-2.5 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-all opacity-70 hover:opacity-100"
                                title="Switch Workspace"
                            >
                                <Icon name="LogOut" size={20} strokeWidth={1.5} />
                            </button>
                        </div>
                    </div>
                </aside>

                {/* Main Content Area */}
                <main className={cn(
                    "flex-1 flex flex-col overflow-hidden min-w-0 bg-transparent relative transition-all duration-700 items-center justify-center",
                    !isZen && "bg-background"
                )}>
                    <div className={cn(
                        "flex-1 flex flex-col w-full transition-all duration-700 ease-in-out h-full overflow-hidden",
                        isZen && "max-w-5xl max-h-[90vh] shadow-2xl bg-background/40 backdrop-blur-md border border-border/10 rounded-2xl z-10"
                    )} data-tour-id="tour-main-content">
                        <Outlet />
                    </div>

                    {/* Escape Hatch (Zen Mode Exit) */}
                    {isZen && (
                        <button
                            onClick={() => updateSetting('zenMode', false)}
                            className="absolute bottom-8 right-8 p-3 rounded-full bg-muted/30 text-muted-foreground hover:bg-primary hover:text-primary-foreground shadow-lg border border-border/50 backdrop-blur-xl transition-all group z-[100] opacity-20 hover:opacity-100"
                            title="Exit Zen Mode (Ctrl+Alt+Z)"
                        >
                            <Icon name="Maximize" size={20} className="group-hover:scale-110 transition-transform" />
                        </button>
                    )}
                </main>
            </div >

            {/* Status Bar (Fixed Bottom) */}
            <div className={cn(
                "transition-all duration-700 transform origin-bottom",
                isZen ? "scale-y-0 h-0 opacity-0 overflow-hidden" : "scale-y-100 h-auto opacity-100"
            )}>
                <StatusBar />
            </div>

            {/* Onboarding Tour */}
            <OnboardingTour />
        </div >
    );
};

interface ActivityBarItemProps {
    to?: string;
    icon: string;
    title: string;
    active?: boolean;
    badge?: number;
    tourId?: string;
}

const ActivityBarItem = ({ to, icon, title, active, badge, tourId }: ActivityBarItemProps) => {
    const content = (
        <div className={cn(
            "relative w-full h-[48px] flex items-center justify-center cursor-pointer transition-colors group",
            active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
        )} title={title} {...(tourId ? { 'data-tour-id': tourId } : {})}>
            {/* Active Border Indicator (Left) */}
            {active && (
                <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-primary" />
            )}
            <Icon
                name={icon}
                size={24}
                strokeWidth={1.5}
                className={cn(
                    "opacity-80 group-hover:opacity-100 transition-all duration-300",
                    active ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                )}
            />

            {/* Badge */}
            {badge !== undefined && (
                <div className="absolute top-0 left-2 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-[4px] bg-blue-600 text-[9px] font-bold text-white shadow-sm ring-1 ring-background z-10 pointer-events-none">
                    {badge > 999 ? '999+' : badge}
                </div>
            )}
        </div>
    );

    if (to) {
        return <Link to={to} className="w-full">{content}</Link>;
    }

    return content;
};
