import { Icon } from './IconRegistry';
import { cn } from '../lib/utils';
import { LayoutControls } from './layout/LayoutControls';
import { useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState, useMemo } from 'react';
import { useLayout } from '../context/LayoutContext';
import { useTheme } from 'next-themes';
import { useAppSettings } from '../context/AppSettingsContext';
import { useAudio } from '../context/AudioContext';
import { useGit } from '../context/GitContext';
import { useConfig } from '../context/ConfigContext';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import { Command } from 'cmdk';
import * as Popover from '@radix-ui/react-popover';
import { useCommands } from '../hooks/useCommands';
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
    const { openQuickAsk } = useLayout();
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const [selectedValue, setSelectedValue] = useState('oracle-quick');
    const { settings } = useAppSettings();

    const libraryResults = useLiveQuery(async () => {
        if (!searchQuery.trim() || searchQuery.length < 2) return [];
        return await db.entries
            .where('title')
            .startsWithIgnoreCase(searchQuery)
            .limit(5)
            .toArray();
    }, [searchQuery]) || [];

    const { commands, executeCommand, searchCommands } = useCommands();

    const filteredCommands = useMemo(() => {
        if (!searchQuery.trim()) return [];
        return searchCommands(searchQuery);
    }, [searchQuery, searchCommands]);

    const showResults = isSearchFocused && (searchQuery.trim().length > 0);

    const workspaceName = vaultPath ? vaultPath.replace(/\\/g, '/').split('/').pop() : null;

    const [canGoBack, setCanGoBack] = useState(false);
    const [canGoForward, setCanGoForward] = useState(false);
    const [isMaximized, setIsMaximized] = useState(false);
    const [isFullScreen, setIsFullScreen] = useState(false);

    useEffect(() => {
        // Listen for window state changes from main process
        const unlisten = window.api.on('window:state-changed', (state: { isMaximized: boolean; isFullScreen: boolean }) => {
            setIsMaximized(state.isMaximized);
            setIsFullScreen(state.isFullScreen);
        });

        return () => {
            if (unlisten) unlisten();
        };
    }, []);

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
        <div 
            className={cn(
                "h-8 flex items-center bg-muted/20 border-b border-border select-none relative z-[100]"
            )} 
            style={{ WebkitAppRegion: 'drag' } as any}
        >
            {/* 1. Left Section: Logo + Navigation & Core App Links */}
            <div className="flex items-center shrink-0 h-full">
                {/* App Logo - Protruding Tab Style */}
                <div
                    className={cn(
                        "flex items-center justify-center px-1.5 h-16 -mt-px self-start",
                        "bg-muted/40 backdrop-blur-md",
                        "border-x border-b border-border/50",
                        "rounded-br-xl shadow-lg z-50 transition-all"
                    )}
                    style={{ WebkitAppRegion: 'drag' } as any}
                >
                    <img
                        src={appIcon}
                        alt="Citadel"
                        className="w-12 h-12 rounded-lg shadow-inner brightness-110 contrast-125"
                        draggable={false}
                    />
                </div>

                {/* Navigation Group - Centered in h-8 */}
                <div className="flex items-center h-8 px-2 ml-1" style={{ WebkitAppRegion: 'no-drag' } as any}>
                    {/* Back/Forward Nav */}
                    <div className="flex items-center">
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
                </div>
            </div>

            {/* 2. Center Section: Flexible Omni Search */}
            <div className="flex-1 flex justify-center min-w-0 h-full items-center px-4">
                <div className="w-full max-w-[400px]" style={{ WebkitAppRegion: 'no-drag' } as any}>
                    <Command
                        label="Omni Search"
                        shouldFilter={false}
                        value={selectedValue}
                        onValueChange={setSelectedValue}
                        className="flex flex-col"
                    >
                        <Popover.Root open={showResults}>
                            <Popover.Anchor asChild>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-muted-foreground/50 group-focus-within:text-primary/70 transition-colors">
                                        <Icon name="Search" size={12} strokeWidth={2.5} />
                                    </div>
                                    <Command.Input
                                        value={searchQuery}
                                        onValueChange={(val) => {
                                            setSearchQuery(val);
                                            // Reset selection to first item when typing
                                            setSelectedValue('oracle-quick');
                                        }}
                                        onFocus={() => setIsSearchFocused(true)}
                                        onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Escape') {
                                                e.currentTarget.blur();
                                                setIsSearchFocused(false);
                                            }

                                            if (e.key === 'Enter') {
                                                if (e.ctrlKey) {
                                                    // Deep Ask shortcut behavior:
                                                    // If we are on a command or library item, we still might want Deep Ask about that?
                                                    // But usually Ctrl+Enter means "Force Deep Ask".
                                                    e.preventDefault();
                                                    navigate(`/codex?q=${encodeURIComponent(searchQuery)}`);
                                                    setSearchQuery('');
                                                    setIsSearchFocused(false);
                                                }
                                                // Regular Enter is handled by cmdk's onSelect for the selectedValue
                                            }
                                        }}
                                        placeholder="Consult the Oracle... (↵ Quick | ^↵ Deep)"
                                        className={cn(
                                            "w-full h-6 pl-10 pr-3 py-1 bg-muted/40 border border-border/60 rounded-full text-[11px] font-medium transition-all duration-300",
                                            "placeholder:text-muted-foreground/40 placeholder:font-normal focus:placeholder:opacity-0",
                                            "focus:outline-none focus:bg-background focus:border-primary/40 focus:ring-4 focus:ring-primary/5 focus:max-w-full",
                                            "hover:bg-muted/60 hover:border-border/80"
                                        )}
                                    />
                                    <div className="absolute inset-y-0 right-3 flex items-center gap-1.5 pointer-events-none opacity-0 group-focus-within:opacity-100 transition-opacity">
                                        <div className="px-1 py-0.5 rounded border border-border/50 bg-muted/50 text-[8px] font-bold text-muted-foreground/60 leading-none">
                                            ENTER
                                        </div>
                                    </div>
                                </div>
                            </Popover.Anchor>

                            <Popover.Portal>
                                <Popover.Content
                                    className={cn(
                                        "w-[400px] p-0 bg-background/95 backdrop-blur-xl border border-border shadow-2xl rounded-xl overflow-hidden z-[9999]",
                                        "animate-in fade-in zoom-in-95 duration-200 mt-2"
                                    )}
                                    side="bottom"
                                    align="center"
                                    sideOffset={0}
                                    onOpenAutoFocus={(e) => e.preventDefault()}
                                >
                                    <Command.List className="overflow-y-auto overflow-x-hidden p-1 custom-scrollbar max-h-[400px]">
                                        {/* Oracle Group - First for default Enter behavior */}
                                        <Command.Group heading="Oracle" className="px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 mt-1">
                                            <Command.Item
                                                value="oracle-quick"
                                                onSelect={() => { openQuickAsk(searchQuery); setSearchQuery(''); }}
                                                className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer aria-selected:bg-primary/10 aria-selected:text-primary transition-all text-sm font-medium"
                                            >
                                                <Icon name="Cpu" size={14} className="opacity-50" />
                                                <span>Quick Ask Oracle: "{searchQuery}"</span>
                                                <Icon name="CornerDownLeft" size={10} className="ml-auto opacity-30" />
                                            </Command.Item>
                                            <Command.Item
                                                value="oracle-deep"
                                                onSelect={() => { navigate(`/codex?q=${encodeURIComponent(searchQuery)}`); setSearchQuery(''); }}
                                                className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer aria-selected:bg-primary/10 aria-selected:text-primary transition-all text-sm font-medium"
                                            >
                                                <Icon name="Zap" size={14} className="opacity-50" />
                                                <span>Deep Ask Oracle: "{searchQuery}"</span>
                                                <span className="ml-auto text-[10px] opacity-40">CTRL+ENTER</span>
                                            </Command.Item>
                                        </Command.Group>

                                        {filteredCommands.length > 0 && (
                                            <Command.Group heading="Commands" className="px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 mt-2">
                                                {filteredCommands.map(cmd => (
                                                    <Command.Item
                                                        key={cmd.id}
                                                        value={`cmd-${cmd.id}`}
                                                        onSelect={() => { executeCommand(cmd.id); setSearchQuery(''); }}
                                                        className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer aria-selected:bg-primary/10 aria-selected:text-primary transition-all text-sm font-medium"
                                                    >
                                                        <Icon name={cmd.icon || 'Terminal'} size={14} className="opacity-50" />
                                                        <span>{cmd.name}</span>
                                                        {cmd.shortcut && (
                                                            <span className="ml-auto text-[10px] opacity-40 font-mono">{cmd.shortcut}</span>
                                                        )}
                                                    </Command.Item>
                                                ))}
                                            </Command.Group>
                                        )}

                                        {libraryResults.length > 0 && (
                                            <Command.Group heading="Library" className="px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 mt-2">
                                                {libraryResults.map(entry => (
                                                    <Command.Item
                                                        key={entry.id}
                                                        value={`lib-${entry.id}`}
                                                        onSelect={() => { navigate(`/${entry.type}/${entry.id}`); setSearchQuery(''); }}
                                                        className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer aria-selected:bg-primary/10 aria-selected:text-primary transition-all text-sm font-medium"
                                                    >
                                                        <Icon name="FileText" size={14} className="opacity-50" />
                                                        <span className="truncate">{entry.title}</span>
                                                        <span className="ml-auto text-[10px] opacity-40 uppercase tracking-tighter">{entry.type}</span>
                                                    </Command.Item>
                                                ))}
                                            </Command.Group>
                                        )}
                                    </Command.List>
                                </Popover.Content>
                            </Popover.Portal>
                        </Popover.Root>
                    </Command>
                </div>
            </div>

            {/* 3. Right Section: Global Nav & Window Controls */}
            <div className="flex items-center shrink-0 h-full ml-auto">
                {/* Core Navigation Icons */}
                <nav className="flex items-center gap-0.5 px-2" style={{ WebkitAppRegion: 'no-drag' } as any}>
                    <button
                        onClick={() => navigate('/codex')}
                        className={cn(
                            "flex items-center justify-center w-8 h-7 rounded transition-all",
                            location.pathname === '/codex' ? "text-primary bg-primary/10" : "text-muted-foreground hover:bg-muted"
                        )}
                        title="Ask the Oracle"
                    >
                        <Icon name="Cpu" size={16} className="text-primary" />
                    </button>
                    <button
                        onClick={() => navigate('/tags')}
                        className={cn(
                            "flex items-center justify-center w-8 h-7 rounded transition-all",
                            location.pathname === '/tags' ? "text-primary bg-primary/10" : "text-muted-foreground hover:bg-muted"
                        )}
                        title="Tags"
                    >
                        <Icon name="Tag" size={16} />
                    </button>
                    {/* Hide secondary navs on extreme narrow screens */}
                    <div className="hidden sm:flex items-center gap-0.5">
                        <button
                            onClick={() => navigate('/rss')}
                            className={cn(
                                "flex items-center justify-center w-8 h-7 rounded transition-all",
                                location.pathname === '/rss' ? "text-primary bg-primary/10" : "text-orange-500 hover:bg-orange-500/10"
                            )}
                            title="RSS Feeds"
                        >
                            <Icon name="Rss" size={16} />
                        </button>
                        <button
                            onClick={() => navigate('/youtube')}
                            className={cn(
                                "flex items-center justify-center w-8 h-7 rounded transition-all",
                                location.pathname === '/youtube' ? "text-primary bg-primary/10" : "text-red-500 hover:bg-red-500/10"
                            )}
                            title="YouTube Feed"
                        >
                            <Icon name="Youtube" size={16} />
                        </button>
                        <button
                            onClick={() => navigate('/repl')}
                            className={cn(
                                "flex items-center justify-center w-8 h-7 rounded transition-all",
                                location.pathname === '/repl' ? "text-primary bg-primary/10" : "text-cyan-500 hover:bg-cyan-500/10"
                            )}
                            title="The Forge"
                        >
                            <Icon name="Terminal" size={16} />
                        </button>
                    </div>
                </nav>

                <div className="w-[1px] h-4 bg-border/40 mx-1" />

                {/* Status & Settings */}
                <div className="flex items-center px-1 gap-1" style={{ WebkitAppRegion: 'no-drag' } as any}>
                    <LayoutControls className="border-none shadow-none bg-transparent" floating={false} />
                    {isAudible && (
                        <button
                            onClick={() => setMuted(!isMuted)}
                            className={cn(
                                "flex items-center justify-center w-8 h-7 rounded transition-all",
                                isMuted ? "text-red-500 hover:bg-red-500/10" : "text-green-500 hover:bg-green-500/10"
                            )}
                            title={isMuted ? "Unmute" : "Mute"}
                        >
                            <Icon name={isMuted ? "VolumeX" : "Volume2"} size={14} />
                        </button>
                    )}
                    <button
                        onClick={() => updateSetting('theme', theme === 'dark' ? 'light' : 'dark')}
                        className="flex items-center justify-center w-8 h-7 rounded hover:bg-muted text-muted-foreground transition-all"
                        title="Toggle Theme"
                    >
                        <Icon name={theme === 'dark' ? 'Sun' : 'Moon'} size={14} />
                    </button>
                    <button
                        onClick={() => navigate('/settings')}
                        className={cn(
                            "flex items-center justify-center w-8 h-7 rounded transition-all",
                            location.pathname.startsWith('/settings') ? "text-primary bg-primary/10" : "text-muted-foreground hover:bg-muted"
                        )}
                        title="Settings"
                    >
                        <Icon name="Settings" size={14} />
                    </button>
                </div>

                {/* System Window Controls */}
                <div className="flex items-center h-full border-l border-border/30 pl-1" style={{ WebkitAppRegion: 'no-drag' } as any}>
                    <button onClick={handleMinimize} className="w-9 h-full flex items-center justify-center hover:bg-muted text-muted-foreground transition-colors">
                        <Icon name="Minus" size={14} />
                    </button>
                    <button onClick={handleMaximize} className="w-9 h-full flex items-center justify-center hover:bg-muted text-muted-foreground transition-colors" title={isFullScreen || isMaximized ? "Restore" : "Maximize"}>
                        <Icon name={isFullScreen || isMaximized ? "Minimize2" : "Maximize"} size={12} />
                    </button>
                    <button onClick={handleClose} className="w-10 h-full flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors">
                        <Icon name="X" size={14} />
                    </button>
                </div>
            </div>
        </div>
    );
};
