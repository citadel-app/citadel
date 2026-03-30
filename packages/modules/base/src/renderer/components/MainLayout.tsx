import { Icon } from '@citadel-app/ui';
import { useTheme } from 'next-themes';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { StatusBar } from './layout/StatusBar';
import { TitleBar } from './TitleBar';
import { cn } from '@citadel-app/ui';
import { useGit } from '../context/GitContext';
import { useAppSettings } from '../context/AppSettingsContext';
import { useConfig } from '../context/ConfigContext';
import { useLayout } from '../context/LayoutContext';
import { CreateEntryDialog } from './CreateEntryDialog';
import { QuickAskModal } from './QuickAskModal';
import { OnboardingTour } from '@citadel-app/ui';
import { useEffect, useState } from 'react';
import { useGlobalCommands } from '../commands';
import { useToast } from '@citadel-app/ui';
import { dataManager } from '../lib/data-manager';
import { appModuleRegistry } from '../host-services';
import { hostApi as __hostApi } from '../host-services';

export const MainLayout = () => {
    useGlobalCommands();
    const { theme, setTheme } = useTheme();
    const { settings, updateSetting } = useAppSettings();
    const { setVaultPath } = useConfig();
    const { toast } = useToast();
    const isZen = settings?.zenMode;

    const location = useLocation();
    const navigate = useNavigate();
    const { status, isRepo } = useGit();
    const { isCreateDialogOpen, setIsCreateDialogOpen } = useLayout();

    const changedFilesCount = status?.files?.length || 0;

    // Load GitHub account for sidebar display
    const [sidebarUser, setSidebarUser] = useState<{ login: string; avatar_url: string; name: string | null } | null>(null);
    useEffect(() => {
        (async () => {
            const accountsJson = await __hostApi.module.invoke('@citadel-app/base', 'secrets.get', 'github_accounts');
            const activeLogin = await __hostApi.module.invoke('@citadel-app/base', 'secrets.get', 'github_active_login');
            if (accountsJson) {
                try {
                    const accounts = JSON.parse(accountsJson);
                    const active = accounts.find((a: any) => a.login === activeLogin) || accounts[0];
                    if (active) setSidebarUser({ login: active.login, avatar_url: active.avatar_url, name: active.name });
                } catch { /* ignore */ }
            }
        })();
    }, []);

    // Data Manager Error Listener
    useEffect(() => {
        const unsubscribe = dataManager.subscribe((event, data) => {
            if (event === 'error') {
                toast(`Keep Error: ${data.message || data}`, { type: 'error' });
            }
        });
        return unsubscribe;
    }, [toast]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Zen Mode Toggle
            if (e.ctrlKey && e.altKey && e.code === 'KeyZ') {
                updateSetting('zenMode', !isZen);
            }
            // New Entry Dialog
            if (e.ctrlKey && e.key.toLowerCase() === 'n') {
                e.preventDefault();
                setIsCreateDialogOpen(true);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isZen, updateSetting, setIsCreateDialogOpen]);

    // Update title bar and status bar height variables
    useEffect(() => {
        document.documentElement.style.setProperty('--titlebar-height', isZen ? '0px' : '32px');
        document.documentElement.style.setProperty('--statusbar-height', isZen ? '0px' : '24px');
    }, [isZen]);

    const sidebarItems = appModuleRegistry.getSidebarItems();
    const topSidebarItems = sidebarItems.filter(item => item.group !== 'bottom');
    const bottomSidebarItems = sidebarItems.filter(item => item.group === 'bottom');

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
            <div className={cn("flex-1 flex overflow-hidden min-h-0")}>
                {/* Activity Bar (VS Code Sidebar) */}
                <aside className={cn(
                    "w-[48px] mt-8 bg-muted/80 backdrop-blur-md flex flex-col items-center py-4 pb-10 gap-4 z-50 gothic-activity-bar",
                    "border-r border-border select-none transition-all duration-700 ease-in-out transform overflow-y-auto scrollbar-none",
                    isZen ? "-translate-x-full opacity-0 h-0" : "translate-x-0 opacity-100 h-full"
                )}>
                    {/* Activity Bar Content Wrapper to handle scrolling naturally */}
                    <div className="flex flex-col items-center gap-1 w-full h-full min-h-max ">
                        {/* Workspace & Logic */}
                        <nav className="flex flex-col gap-1 w-full items-center">
                            <ActivityBarItem to="/" icon="Scroll" title="The Archives" active={location.pathname === '/'} tourId="tour-browser" />
                            <ActivityBarItem to="/notebooks" icon="BookOpen" title="The Scriptorium" active={location.pathname === '/notebooks'} tourId="tour-notebook" />
                            <ActivityBarItem to="/kanban" icon="Swords" title="The War Room" active={location.pathname === '/kanban'} tourId="tour-kanban" />
                        </nav>

                        {/* Separator */}
                        <div className="w-6 h-[1px] bg-border/40 shrink-0" />

                        {/* Creative Suite */}
                        <nav className="flex flex-col gap-1 w-full items-center">
                            <ActivityBarItem to="/notes" icon="Feather" title="The Journals" active={location.pathname === '/notes'} />
                        </nav>

                        {/* External Modules Sidebar Items (Top) */}
                        {topSidebarItems.length > 0 && (
                            <>
                                <div className="w-6 h-[1px] bg-border/40 shrink-0 my-2" />
                                <nav className="flex flex-col gap-1 w-full items-center">
                                    {topSidebarItems.map(item => (
                                        <ActivityBarItem
                                            key={item.id}
                                            to={item.path}
                                            icon={item.icon}
                                            title={item.label}
                                            active={location.pathname.startsWith(item.path)}
                                            badge={item.badge}
                                        />
                                    ))}
                                </nav>
                            </>
                        )}

                        {/* Bottom Utility Icons */}
                        <div className="mt-auto flex flex-col gap-1 w-full items-center mb-2">
                            {/* Separator */}
                            <div className="w-6 h-[1px] bg-border/40 mb-2 shrink-0" />

                            <ActivityBarItem
                                to="/plugins"
                                icon="Puzzle"
                                title="Extensions & Plugins"
                                active={location.pathname.startsWith('/plugins')}
                            />

                            {isRepo && (settings && (settings.developerMode || !settings.autoCommitEnabled)) && (
                                <ActivityBarItem
                                    to="/source-control"
                                    icon="Castle"
                                    title="The Bastion"
                                    tourId="tour-source-control"
                                    active={location.pathname === '/source-control'}
                                    badge={changedFilesCount > 0 ? changedFilesCount : undefined}
                                />
                            )}

                            {/* External Modules Sidebar Items (Bottom) */}
                            {bottomSidebarItems.map(item => (
                                <ActivityBarItem
                                    key={item.id}
                                    to={item.path}
                                    icon={item.icon}
                                    title={item.label}
                                    active={location.pathname.startsWith(item.path)}
                                    badge={item.badge}
                                />
                            ))}

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
                                title="Switch Keep"
                            >
                                <Icon name="LogOut" size={20} strokeWidth={1.5} />
                            </button>
                        </div>
                    </div>
                </aside>

                {/* Main Content Area */}
                <main className={cn(
                    "flex-1 flex flex-col overflow-hidden min-w-0 bg-transparent relative transition-all duration-700",
                    !isZen && "bg-background",
                    isZen && "items-center justify-center"
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

            {/* Quick Ask Modal */}
            <QuickAskModal />

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
            "relative w-full h-[36px] flex items-center justify-center cursor-pointer transition-colors group nav-accent",
            active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
        )} title={title} {...(tourId ? { 'data-tour-id': tourId } : {})}>
            {/* Medieval Active Indicator (Gem) */}
            {active && (
                <div className="nav-active-gem" />
            )}
            <div className={cn(
                    "opacity-80 group-hover:opacity-100 transition-all duration-300",
                    active ? "text-primary scale-110" : "text-muted-foreground group-hover:text-foreground"
                )}>
                <Icon name={icon} size={16} />
            </div>

            {/* Badge */}
            {badge !== undefined && (
                <div className="opacity-70 absolute top-6 left-4 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-[4px] bg-primary text-primary-foreground text-[9px] font-bold shadow-sm ring-1 ring-background z-10 pointer-events-none">
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
