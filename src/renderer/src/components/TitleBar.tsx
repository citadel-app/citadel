import { Icon } from './IconRegistry';
import { cn } from '../lib/utils';
import { LayoutControls } from './layout/LayoutControls';
import { useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useLayout } from '../context/LayoutContext';
import { useTheme } from 'next-themes';
import { useAppSettings } from '../context/AppSettingsContext';
import { useAudio } from '../context/AudioContext';
import { useGit } from '../context/GitContext';
import { useConfig } from '../context/ConfigContext';
import appIcon from '../../../../resources/icon.png';

export const TitleBar = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { openCreateDialog } = useLayout();
    const { theme, setTheme } = useTheme();
    const { updateSetting } = useAppSettings();
    const { isAudible, isMuted, setMuted } = useAudio();
    const { isRepo, status } = useGit();
    const { vaultPath } = useConfig();

    const workspaceName = vaultPath ? vaultPath.replace(/\\/g, '/').split('/').pop() : null;

    const [canGoBack, setCanGoBack] = useState(false);
    const [canGoForward, setCanGoForward] = useState(false);

    useEffect(() => {
        // Use the Navigation API if available (Modern Electron/Chrome)
        // @ts-ignore - navigation API might not be in generic TS types yet
        if (window.navigation) {
            // @ts-ignore
            setCanGoBack(window.navigation.canGoBack);
            // @ts-ignore
            setCanGoForward(window.navigation.canGoForward);
        } else {
            // Fallback for older environments (less accurate)
            setCanGoBack(window.history.length > 1);
            setCanGoForward(true); // Hard to know for sure easily
        }
    }, [location]);

    const handleMinimize = () => window.api.window.minimize();
    const handleMaximize = () => window.api.window.maximize();
    const handleClose = () => window.api.window.close();

    return (
        <div className="h-8 flex items-center justify-between bg-muted/20 border-b border-border select-none pl-1" style={{ WebkitAppRegion: 'drag' } as any}>
            {/* Left Section: Logo + Navigation & Core App Links */}
            <div className="flex h-full items-center" style={{ WebkitAppRegion: 'no-drag' } as any}>
                {/* App Logo */}
                <div className="flex items-center gap-1.5 px-2" style={{ WebkitAppRegion: 'drag' } as any}>
                    <img src={appIcon} alt="Citadel" className="w-4 h-4 rounded-sm" draggable={false} />
                </div>
                {/* Back/Forward Nav */}
                <div className="flex items-center gap-0.5 px-2">
                    <button
                        onClick={() => navigate(-1)}
                        disabled={!canGoBack}
                        className={cn(
                            "flex items-center justify-center w-7 h-7 rounded transition-colors",
                            canGoBack
                                ? "hover:bg-muted text-muted-foreground"
                                : "text-muted-foreground/30 cursor-not-allowed"
                        )}
                        title="Go Back"
                    >
                        <Icon name="ChevronLeft" size={14} />
                    </button>
                    <button
                        onClick={() => navigate(1)}
                        disabled={!canGoForward}
                        className={cn(
                            "flex items-center justify-center w-7 h-7 rounded transition-colors",
                            canGoForward
                                ? "hover:bg-muted text-muted-foreground"
                                : "text-muted-foreground/30 cursor-not-allowed"
                        )}
                        title="Go Forward"
                    >
                        <Icon name="ChevronRight" size={14} />
                    </button>
                </div>

                <div className="w-[1px] h-4 bg-border/40 mx-1" />

                {/* Core Navigation (Moved from Sidebar) */}
                <nav className="flex items-center gap-0.5 px-1">
                    <button
                        onClick={() => navigate('/codex')}
                        className={cn(
                            "flex items-center justify-center w-8 h-8 rounded transition-all",
                            location.pathname === '/codex' ? "text-primary bg-primary/10" : "text-muted-foreground hover:bg-muted"
                        )}
                        title="Open Citadel AI"
                    >
                        <Icon name="Cpu" size={16} className="text-primary" />
                    </button>
                    <button
                        onClick={() => navigate('/tags')}
                        className={cn(
                            "flex items-center justify-center w-8 h-8 rounded transition-all",
                            location.pathname === '/tags' ? "text-primary bg-primary/10" : "text-muted-foreground hover:bg-muted"
                        )}
                        title="Tags"
                    >
                        <Icon name="Tag" size={16} />
                    </button>
                    <button
                        onClick={() => navigate('/rss')}
                        className={cn(
                            "flex items-center justify-center w-8 h-8 rounded transition-all",
                            location.pathname === '/rss'
                                ? "text-primary bg-primary/10"
                                : "text-orange-500 hover:bg-orange-500/10"
                        )}
                        title="RSS Feeds"
                    >
                        <Icon name="Rss" size={16} />
                    </button>
                    <button
                        onClick={() => navigate('/youtube')}
                        className={cn(
                            "flex items-center justify-center w-8 h-8 rounded transition-all",
                            location.pathname === '/youtube'
                                ? "text-primary bg-primary/10"
                                : "text-red-500 hover:bg-red-500/10"
                        )}
                        title="YouTube Feed"
                    >
                        <Icon name="Youtube" size={16} />
                    </button>
                    <button
                        onClick={() => navigate('/repl')}
                        className={cn(
                            "flex items-center justify-center w-8 h-8 rounded transition-all",
                            location.pathname === '/repl'
                                ? "text-primary bg-primary/10"
                                : "text-cyan-500 hover:bg-cyan-500/10"
                        )}
                        title="Docker REPL"
                    >
                        <Icon name="Terminal" size={16} />
                    </button>
                </nav>
            </div>

            {/* Center: Workspace Name + Git Status */}
            {workspaceName && (
                <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 pointer-events-none">
                    <span className="text-[11px] font-bold text-muted-foreground/70 truncate max-w-[200px]">
                        {workspaceName}
                    </span>
                    {isRepo !== null && (
                        <div className={cn(
                            "flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider",
                            isRepo
                                ? "text-emerald-500/80 bg-emerald-500/5"
                                : "text-muted-foreground/40 bg-muted/30"
                        )}>
                            <Icon name={isRepo ? "GitBranch" : "GitBranchPlus"} size={10} strokeWidth={2} />
                            {isRepo && status?.current ? status.current : (isRepo ? 'Git' : 'No Git')}
                        </div>
                    )}
                </div>
            )}

            {/* Right Section: Actions & Window Controls */}
            <div className="flex h-full items-center">
                <div className="flex items-center gap-2" style={{ WebkitAppRegion: 'no-drag' } as any}>
                    {/* Audio Status Control */}
                    {isAudible && (
                        <button
                            onClick={() => setMuted(!isMuted)}
                            className={cn(
                                "flex items-center gap-1.5 px-3 py-1 rounded-full transition-all text-[10px] font-bold tracking-tight border",
                                isMuted
                                    ? "bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20"
                                    : "bg-green-500/10 text-green-500 border-green-500/20 hover:bg-green-500/20"
                            )}
                            title={isMuted ? "Unmute All" : "Mute All"}
                            style={{ WebkitAppRegion: 'no-drag' } as any}
                        >
                            <Icon name={isMuted ? "VolumeX" : "Volume2"} size={12} strokeWidth={2.5} />
                            <span>{isMuted ? 'Muted' : 'Audible'}</span>
                        </button>
                    )}

                    {/* New Entry Action */}

                    {/* <div className="w-[1px] h-4 bg-border/40 mx-1" /> */}

                    {/* Codex Logo (Moved to Right) - Now points to Codex */}
                    {/* <button
                        className="flex gap-1.5 items-center px-2 py-1 rounded hover:bg-muted/50 transition-colors"
                        title="Go to Codex"
                        onClick={() => navigate('/codex')}
                    >
                        <Icon name="Cpu" size={14} strokeWidth={2.5} className="text-primary" />
                        <span className="text-[10px] font-black tracking-widest text-muted-foreground/80 uppercase">Codex</span>
                    </button> */}

                    {/* <div className="w-[1px] h-4 bg-border/40 mx-1" /> */}

                    {/* Layout Controls */}
                    <div className="flex items-center px-1">
                        <LayoutControls className="border-none shadow-none bg-transparent" floating={false} />
                    </div>

                    {/* Global Utilities */}
                    <div className="flex items-center gap-0.5 px-1 border-l border-border/30 h-full">
                        <button
                            onClick={() => {
                                const newTheme = theme === 'dark' ? 'light' : 'dark';
                                updateSetting('theme', newTheme);
                            }}
                            className="flex items-center justify-center w-8 h-8 rounded hover:bg-muted/50 transition-colors text-muted-foreground"
                            title="Toggle Theme"
                        >
                            <Icon name={theme === 'dark' ? 'Sun' : 'Moon'} size={14} strokeWidth={1.5} />
                        </button>
                        <button
                            onClick={() => navigate('/settings')}
                            className={cn(
                                "flex items-center justify-center w-8 h-8 rounded transition-colors",
                                location.pathname.startsWith('/settings')
                                    ? "bg-primary/10 text-primary shadow-[inset_0_0_0_1px_rgba(var(--primary-rgb),0.2)]"
                                    : "hover:bg-muted/50 text-muted-foreground"
                            )}
                            title="Settings"
                        >
                            <Icon name="Settings" size={14} strokeWidth={1.5} />
                        </button>
                    </div>
                </div>

                {/* Window Controls */}
                <div className="flex h-full border-l border-border/30" style={{ WebkitAppRegion: 'no-drag' } as any}>
                    <button
                        onClick={handleMinimize}
                        className="flex items-center justify-center w-10 h-full hover:bg-muted/50 transition-colors text-muted-foreground"
                        title="Minimize"
                    >
                        <Icon name="Minus" size={14} />
                    </button>
                    <button
                        onClick={handleMaximize}
                        className="flex items-center justify-center w-10 h-full hover:bg-muted/50 transition-colors text-muted-foreground"
                        title="Maximize/Restore"
                    >
                        <Icon name="Square" size={11} />
                    </button>
                    <button
                        onClick={handleClose}
                        className="flex items-center justify-center w-10 h-full hover:bg-destructive hover:text-white transition-colors text-muted-foreground"
                        title="Close"
                    >
                        <Icon name="X" size={14} />
                    </button>
                </div>
            </div>
        </div>
    );
};
