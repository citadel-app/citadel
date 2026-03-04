import React from 'react';
import { FolderOpen, X, ChevronRight, Github, Loader2, Plus, Copy, Check, ExternalLink, Shield, GitBranch, Cpu, BookOpen, Globe, Wifi, WifiOff, ArrowLeft, Lock, Search, LogOut } from 'lucide-react';
import { dataManager } from '../lib/data-manager';
import { useConfig } from '../context/ConfigContext';
import { PRESETS, WorkspacePreset } from '../config/presets';
import { DynamicIcon } from '../components/IconRegistry';
import { DEFAULT_WORKSPACE_CONFIG } from '../config/entry-types';
import logoMain from '../assets/branding/banner-inverted.png';

type WelcomeStep = 'auth-gate' | 'logged-in-setup' | 'offline-setup' | 'configure-workspace' | 'create-repo' | 'pick-repo' | 'clone-remote';

interface WelcomePageProps {
    initialStep?: WelcomeStep;
}

export const WelcomePage: React.FC<WelcomePageProps> = ({ initialStep }) => {
    const { setVaultPath, recentVaults } = useConfig();

    // Determine initial step from props or default to auth-gate
    const [step, setStep] = React.useState<WelcomeStep>(initialStep || 'auth-gate');

    // --- Workspace Configuration State ---
    const [selectedPreset, setSelectedPreset] = React.useState<WorkspacePreset | null>(PRESETS[0]);
    const [selectedEntries, setSelectedEntries] = React.useState<Set<string>>(new Set([Object.keys(DEFAULT_WORKSPACE_CONFIG.entries)[0]]));
    const [configMode, setConfigMode] = React.useState<'preset' | 'custom'>('preset');

    // --- Create Repo State ---
    const [wizardStep, setWizardStep] = React.useState(1);
    const [repoName, setRepoName] = React.useState('');
    const [repoDesc, setRepoDesc] = React.useState('');
    const [isPrivate, setIsPrivate] = React.useState(true);
    const [localPath, setLocalPath] = React.useState('');
    const [isCreating, setIsCreating] = React.useState(false);
    const [createError, setCreateError] = React.useState<string | null>(null);

    // --- Pick Repo State ---
    const [repos, setRepos] = React.useState<any[]>([]);
    const [reposLoading, setReposLoading] = React.useState(false);
    const [repoSearchQuery, setRepoSearchQuery] = React.useState('');
    const [selectedRepo, setSelectedRepo] = React.useState<any | null>(null);
    const [clonePath, setClonePath] = React.useState('');
    const [isCloning, setIsCloning] = React.useState(false);

    // --- Clone Remote State ---
    const [remoteUrlToClone, setRemoteUrlToClone] = React.useState('');
    const [cloneMethod, setCloneMethod] = React.useState<'clone' | 'fork' | 'disconnected'>('clone');
    const [cloneRemotePath, setCloneRemotePath] = React.useState('');
    const [isCloningRemote, setIsCloningRemote] = React.useState(false);
    const [cloneRemoteError, setCloneRemoteError] = React.useState<string | null>(null);
    const [selectedCloneAccount, setSelectedCloneAccount] = React.useState<string | null>(null);

    // --- Multi-Account State ---
    type GitHubAccount = { login: string; name: string | null; avatar_url: string; token: string };
    const [accounts, setAccounts] = React.useState<GitHubAccount[]>([]);
    const [activeLogin, setActiveLogin] = React.useState<string | null>(null);
    const [showAccountMenu, setShowAccountMenu] = React.useState(false);

    // Computed active account & token for backward compatibility
    const activeAccount = React.useMemo(() => accounts.find(a => a.login === activeLogin) || null, [accounts, activeLogin]);
    const githubToken = activeAccount?.token || '';
    const githubUser = activeAccount ? { login: activeAccount.login, avatar_url: activeAccount.avatar_url, name: activeAccount.name } : null;
    const authStatus = activeAccount ? 'success' as const : 'idle' as const;

    // --- Device Flow UI State ---
    const [userCode, setUserCode] = React.useState('');
    const [verificationUri, setVerificationUri] = React.useState('');
    const [isPolling, setIsPolling] = React.useState(false);
    const [codeCopied, setCodeCopied] = React.useState(false);
    const [authError, setAuthError] = React.useState<string | null>(null);
    const [authExpired, setAuthExpired] = React.useState(false);
    const pollTimerRef = React.useRef<NodeJS.Timeout | null>(null);

    // Track which mode we came from for back navigation in configure-workspace
    const [workspaceOrigin, setWorkspaceOrigin] = React.useState<'logged-in' | 'offline'>('offline');

    // --- Persist / Load Accounts ---
    const saveAccounts = async (accs: GitHubAccount[], active: string | null) => {
        await window.api.secrets.set('github_accounts', JSON.stringify(accs));
        if (active) await window.api.secrets.set('github_active_login', active);
    };

    const addAccountFromToken = async (token: string): Promise<GitHubAccount | null> => {
        try {
            const user = await window.api.github.getUser(token);
            const newAcc: GitHubAccount = { login: user.login, name: user.name, avatar_url: user.avatar_url, token };
            const updated = [...accounts.filter(a => a.login !== user.login), newAcc];
            setAccounts(updated);
            setActiveLogin(user.login);
            await saveAccounts(updated, user.login);
            return newAcc;
        } catch {
            return null;
        }
    };

    const switchAccount = async (login: string) => {
        setActiveLogin(login);
        await window.api.secrets.set('github_active_login', login);
        setShowAccountMenu(false);
    };

    const logout = async (login: string) => {
        const updated = accounts.filter(a => a.login !== login);
        setAccounts(updated);
        if (activeLogin === login) {
            const newActive = updated.length > 0 ? updated[0].login : null;
            setActiveLogin(newActive);
            if (newActive) {
                await saveAccounts(updated, newActive);
            } else {
                await window.api.secrets.set('github_accounts', JSON.stringify(updated));
                await window.api.secrets.set('github_active_login', '');
                setStep('auth-gate');
            }
        } else {
            await saveAccounts(updated, activeLogin);
        }
        setShowAccountMenu(false);
    };

    // --- Load existing accounts on mount ---
    React.useEffect(() => {
        const loadExisting = async () => {
            // Migrate from old single-token format
            const oldToken = await window.api.secrets.get('github_token');
            const accountsJson = await window.api.secrets.get('github_accounts');

            if (accountsJson) {
                try {
                    const parsed = JSON.parse(accountsJson) as GitHubAccount[];
                    // Validate tokens are still good
                    const valid: GitHubAccount[] = [];
                    for (const acc of parsed) {
                        try {
                            await window.api.github.getUser(acc.token);
                            valid.push(acc);
                        } catch {
                            // Token expired, skip
                        }
                    }
                    if (valid.length > 0) {
                        setAccounts(valid);
                        const activePref = await window.api.secrets.get('github_active_login');
                        const active = valid.find(a => a.login === activePref) ? activePref : valid[0].login;
                        setActiveLogin(active);
                        if (!initialStep || initialStep === 'auth-gate') {
                            setStep('logged-in-setup');
                        }
                    } else if (oldToken) {
                        await addAccountFromToken(oldToken);
                        if (!initialStep || initialStep === 'auth-gate') {
                            setStep('logged-in-setup');
                        }
                    }
                } catch {
                    if (oldToken) {
                        await addAccountFromToken(oldToken);
                        if (!initialStep || initialStep === 'auth-gate') {
                            setStep('logged-in-setup');
                        }
                    }
                }
            } else if (oldToken) {
                await addAccountFromToken(oldToken);
                if (!initialStep || initialStep === 'auth-gate') {
                    setStep('logged-in-setup');
                }
            }
        };
        loadExisting();
        return () => { if (pollTimerRef.current) clearInterval(pollTimerRef.current); };
    }, []);

    // --- Deep Link Handling ---
    React.useEffect(() => {
        const cleanup = window.api.app.onDeepLink((url: string) => {
            console.log('[WelcomePage] Received deep link:', url);
            try {
                // Parse citadel://clone?url=https://github.com/user/repo
                if (url.startsWith('citadel://') || url.startsWith('codex://')) {
                    const urlObj = new URL(url);
                    if (urlObj.hostname === 'clone') {
                        const targetUrl = urlObj.searchParams.get('url');
                        if (targetUrl) {
                            setStep('clone-remote');
                            setRemoteUrlToClone(targetUrl);
                        }
                    }
                }
            } catch (e) {
                console.error('[WelcomePage] Failed to parse deep link:', e);
            }
        });

        return cleanup;
    }, []);

    // --- Auth Flow ---
    const startDeviceFlow = async () => {
        try {
            setIsPolling(true);
            setAuthError(null);
            setAuthExpired(false);
            const flow = await window.api.github.startDeviceFlow();
            setUserCode(flow.user_code);
            setVerificationUri(flow.verification_uri);
            window.api.app.openExternal(flow.verification_uri);

            let interval = (flow.interval || 5) * 1000;
            const pollFn = async () => {
                try {
                    const result = await window.api.github.pollDeviceToken(flow.device_code);
                    if (result.status === 'success' && result.access_token) {
                        if (pollTimerRef.current) clearInterval(pollTimerRef.current);
                        setIsPolling(false);
                        setUserCode('');
                        await addAccountFromToken(result.access_token);
                        setStep('logged-in-setup');
                    } else if (result.status === 'expired') {
                        if (pollTimerRef.current) clearInterval(pollTimerRef.current);
                        setIsPolling(false);
                        setAuthExpired(true);
                    } else if (result.status === 'error') {
                        if (pollTimerRef.current) clearInterval(pollTimerRef.current);
                        setIsPolling(false);
                        setAuthError(result.error || 'Authentication failed.');
                    } else if (result.error === 'slow_down') {
                        interval += 5000;
                        if (pollTimerRef.current) clearInterval(pollTimerRef.current);
                        pollTimerRef.current = setInterval(pollFn, interval);
                    }
                } catch (e: any) {
                    console.error('[WelcomePage] Poll error:', e);
                }
            };
            pollTimerRef.current = setInterval(pollFn, interval);
        } catch (e: any) {
            console.error('[WelcomePage] Device flow error:', e);
            setIsPolling(false);
            setAuthError(e.message || 'Failed to start GitHub authentication.');
        }
    };

    const handleCopyCode = () => {
        navigator.clipboard.writeText(userCode);
        setCodeCopied(true);
        setTimeout(() => setCodeCopied(false), 2000);
    };

    // --- Workspace Actions ---
    const handleOpenFolder = async () => {
        const path = await window.api.dialog.openDirectory();
        if (path) {
            await setVaultPath(path);
        }
    };

    const handleCreateFromPreset = async (preset: WorkspacePreset) => {
        if (preset.id === 'custom-builder') {
            setConfigMode('custom');
            return;
        }
        const path = await window.api.dialog.openDirectory();
        if (path) {
            await window.api.fs.allowPath(path);
            await dataManager.createWorkspace(path, preset.config);
            localStorage.setItem('codex-show-tour', 'true');
            await setVaultPath(path);
        }
    };

    const toggleEntry = (type: string) => {
        const next = new Set(selectedEntries);
        if (next.has(type)) {
            if (next.size > 1) next.delete(type);
        } else {
            next.add(type);
        }
        setSelectedEntries(next);
    };

    const handleCreateCustom = async () => {
        const path = await window.api.dialog.openDirectory();
        if (path) {
            const customEntries: Record<string, any> = {};
            selectedEntries.forEach(type => {
                const entry = DEFAULT_WORKSPACE_CONFIG.entries[type];
                if (entry) customEntries[type] = entry;
            });
            const config = { ...DEFAULT_WORKSPACE_CONFIG, entries: customEntries };
            await window.api.fs.allowPath(path);
            await dataManager.createWorkspace(path, config);
            localStorage.setItem('codex-show-tour', 'true');
            await setVaultPath(path);
        }
    };

    // --- Repo Listing ---
    const loadRepos = async () => {
        if (!githubToken) return;
        setReposLoading(true);
        try {
            const data = await window.api.github.listRepos(githubToken);
            setRepos(data);
        } catch (e: any) {
            console.error('[WelcomePage] Failed to list repos:', e);
        } finally {
            setReposLoading(false);
        }
    };

    const filteredRepos = React.useMemo(() => {
        if (!repoSearchQuery) return repos;
        const q = repoSearchQuery.toLowerCase();
        return repos.filter(r =>
            r.full_name.toLowerCase().includes(q) ||
            (r.description && r.description.toLowerCase().includes(q))
        );
    }, [repos, repoSearchQuery]);

    const handleCloneRepo = async () => {
        if (!selectedRepo || !clonePath) return;
        setIsCloning(true);
        setCreateError(null);
        try {
            const authUrl = selectedRepo.clone_url.replace('https://', `https://${githubToken}@`);
            await window.api.git.clone(authUrl, clonePath);
            await setVaultPath(clonePath);
        } catch (e: any) {
            console.error('[WelcomePage] Clone failed:', e);
            setCreateError(e.message || 'Cloning failed.');
        } finally {
            setIsCloning(false);
        }
    };



    // --- Clone Remote Functions ---
    const handleCloneRemoteRepo = async () => {
        if (!remoteUrlToClone || !cloneRemotePath) return;
        setIsCloningRemote(true);
        setCloneRemoteError(null);
        try {
            let cloneUrl = remoteUrlToClone;

            // Validate URL and ensure it has .git suffix if it's GitHub
            if (!cloneUrl.endsWith('.git') && cloneUrl.includes('github.com')) {
                cloneUrl += '.git';
            }

            const activeCloneToken = accounts.find(a => a.login === selectedCloneAccount)?.token || '';

            if (cloneMethod === 'fork') {
                if (!activeCloneToken) throw new Error("Requires GitHub authentication to fork.");
                // Parse owner/repo
                const match = cloneUrl.match(/github\.com\/([^\/]+)\/([^\/]+)(?:\.git)?$/);
                if (!match) throw new Error("Could not parse GitHub repository from URL for forking.");
                const owner = match[1];
                let repo = match[2];
                if (repo.endsWith('.git')) repo = repo.slice(0, -4);

                // Call github API to fork
                const forkedRepo = await window.api.github.forkRepository(activeCloneToken, owner, repo);
                cloneUrl = forkedRepo.clone_url;

                // Auth URL
                const authUrl = cloneUrl.replace('https://', `https://${activeCloneToken}@`);
                await window.api.git.clone(authUrl, cloneRemotePath);
            } else if (cloneMethod === 'clone') {
                if (activeCloneToken) {
                    // Try authenticated clone
                    const authUrl = cloneUrl.replace('https://', `https://${activeCloneToken}@`);
                    await window.api.git.clone(authUrl, cloneRemotePath);
                } else {
                    // Fallback to anonymous clone
                    await window.api.git.clone(cloneUrl, cloneRemotePath);
                }
            } else if (cloneMethod === 'disconnected') {
                // Clone anonymously
                await window.api.git.clone(cloneUrl, cloneRemotePath);
                // Remove remote origin, treating it as completely disconnected and local
                await window.api.git.removeRemote(cloneRemotePath, 'origin');
            }

            await setVaultPath(cloneRemotePath);
        } catch (e: any) {
            console.error('[WelcomePage] Remote clone failed:', e);
            setCloneRemoteError(e.message || 'Remote clone failed.');
        } finally {
            setIsCloningRemote(false);
        }
    };

    // --- Create Remote Repo ---
    const handleCreateRemoteRepo = async () => {
        if (!repoName || !githubToken || !localPath) {
            setCreateError('Please fill in all required fields.');
            return;
        }
        setIsCreating(true);
        setCreateError(null);
        try {
            const repoData = await window.api.github.createRepository(githubToken, repoName, repoDesc, isPrivate);

            // Build workspace config based on preset or custom selection
            let config;
            if (configMode === 'custom') {
                const customEntries: Record<string, any> = {};
                selectedEntries.forEach(type => {
                    const entry = DEFAULT_WORKSPACE_CONFIG.entries[type];
                    if (entry) customEntries[type] = entry;
                });
                config = { ...DEFAULT_WORKSPACE_CONFIG, entries: customEntries };
            } else {
                config = selectedPreset ? selectedPreset.config : DEFAULT_WORKSPACE_CONFIG;
            }

            await window.api.fs.allowPath(localPath);

            // Generate templated files (README, etc.) *before* Codex config
            await window.api.fs.scaffoldWorkspace(localPath, repoData.full_name, repoData.clone_url);

            // Bootstrap Codex configuration on top of the template
            await dataManager.createWorkspace(localPath, config);

            await window.api.git.init(localPath);
            // Set workspace-specific git user from GitHub account
            if (githubUser) {
                await window.api.git.setConfig(localPath, 'user.name', githubUser.name || githubUser.login);
                await window.api.git.setConfig(localPath, 'user.email', `${githubUser.login}@users.noreply.github.com`);
            }
            await window.api.git.addRemote(localPath, 'origin', repoData.clone_url);
            await window.api.git.add(localPath, ['.']);
            await window.api.git.commit(localPath, 'Initial commit from Citadel');
            const authUrl = repoData.clone_url.replace('https://', `https://${githubToken}@`);
            await window.api.git.addRemote(localPath, 'origin_auth', authUrl);
            await window.api.git.push(localPath, 'origin_auth', 'main');
            localStorage.setItem('codex-show-tour', 'true');
            await setVaultPath(localPath);
        } catch (e: any) {
            console.error('[WelcomePage] Repo creation failed:', e);
            setCreateError(e.message || 'Failed to create repository.');
        } finally {
            setIsCreating(false);
        }
    };

    const handleBrowsePath = async (setter: (path: string) => void) => {
        const path = await window.api.dialog.openDirectory();
        if (path) setter(path);
    };

    // --- Recent Workspaces Component ---
    const RecentWorkspaces = () => (
        recentVaults && recentVaults.length > 0 ? (
            <div className="space-y-2">
                <h3 className="text-xs font-black text-muted-foreground/60 uppercase tracking-[0.2em] px-1">Recent Workspaces</h3>
                <div className="space-y-1.5">
                    {recentVaults.map((path, i) => (
                        <button
                            key={i}
                            onClick={() => setVaultPath(path)}
                            className="w-full text-left p-3 rounded-xl bg-card/20 border border-muted/50 hover:bg-card hover:border-primary/30 transition-all group flex items-center gap-3"
                        >
                            <FolderOpen className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                            <div className="flex-1 min-w-0">
                                <div className="text-xs font-bold truncate text-foreground/80 group-hover:text-primary transition-colors">
                                    {path.split(/[\\/]/).pop()}
                                </div>
                                <div className="text-[9px] text-muted-foreground truncate opacity-60 font-mono">
                                    {path}
                                </div>
                            </div>
                            <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-primary" />
                        </button>
                    ))}
                </div>
            </div>
        ) : null
    );

    // --- Feature Pills ---
    const FeaturePills = () => (
        <div className="flex flex-wrap justify-center gap-3">
            {[
                { icon: BookOpen, label: 'Knowledge Base' },
                { icon: GitBranch, label: 'Git-Backed' },
                { icon: Cpu, label: 'AI-Powered' },
                { icon: Shield, label: 'Local-First' },
            ].map((feat, i) => (
                <div key={feat.label} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-card/30 border border-muted/40 text-[10px] font-bold text-muted-foreground/80 backdrop-blur-sm animate-in fade-in slide-in-from-bottom-2 duration-500" style={{ animationDelay: `${i * 100}ms` }}>
                    <feat.icon className="w-3 h-3 text-primary/70" />
                    {feat.label}
                </div>
            ))}
        </div>
    );

    // --- Back Button ---
    const BackButton = ({ to, label }: { to: WelcomeStep; label?: string }) => (
        <button
            onClick={() => setStep(to)}
            className="flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-primary transition-colors uppercase tracking-wider"
        >
            <ArrowLeft className="w-3.5 h-3.5" />
            {label || 'Back'}
        </button>
    );

    // --- Header with Logo ---
    const PageHeader = ({ subtitle }: { subtitle?: string }) => (
        <div className="flex flex-col items-center gap-3">
            <img src={logoMain} alt="Citadel" className="w-96 object-contain drop-shadow-lg" />

            {subtitle && (
                <p className="text-muted-foreground text-sm max-w-md text-center font-medium opacity-80" style={{ fontFamily: "'Cinzel', serif" }}>
                    {subtitle}
                </p>
            )}
        </div>
    );

    return (
        <div
            className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-6 sm:p-12 overflow-y-auto relative font-outfit"
            style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
        >
            {/* Background Decorative Elements */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-20">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/20 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-500/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />
            </div>

            <button
                onClick={() => window.api.window.close()}
                className="absolute top-4 right-4 p-2 rounded-full hover:bg-muted/50 transition-colors z-50"
                style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
                title="Close Application"
            >
                <X className="w-5 h-5 text-muted-foreground" />
            </button>

            <div
                className="max-w-4xl w-full space-y-8 z-10"
                style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
            >
                {/* ========== AUTH GATE STEP ========== */}
                {step === 'auth-gate' && (
                    <div className="flex flex-col items-center gap-10 animate-in fade-in duration-500">
                        <PageHeader subtitle="Smart and hackable workspace for software engineering and document discovery." />
                        <FeaturePills />

                        {/* Auth Options */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-2xl">
                            {/* Sign in with GitHub */}
                            <button
                                onClick={startDeviceFlow}
                                disabled={isPolling}
                                className="group flex flex-col items-center gap-5 p-8 rounded-[2rem] bg-card/40 border border-muted hover:bg-card hover:border-primary/40 transition-all backdrop-blur-sm hover:-translate-y-1"
                            >
                                <div className="p-4 rounded-2xl bg-muted/50 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                                    <Github className="w-8 h-8" />
                                </div>
                                <div className="text-center space-y-1">
                                    <h3 className="font-bold text-base">Sign in with GitHub</h3>
                                    <p className="text-[10px] text-muted-foreground font-medium opacity-60">
                                        Create repos, sync workspaces, collaborate
                                    </p>
                                </div>
                                <div className="flex items-center gap-1.5 text-[9px] font-bold text-muted-foreground/40 uppercase tracking-wider">
                                    <Shield className="w-3 h-3" />
                                    GitHub App • Fine-grained permissions
                                </div>
                            </button>

                            {/* Continue Offline */}
                            <button
                                onClick={() => setStep('offline-setup')}
                                className="group flex flex-col items-center gap-5 p-8 rounded-[2rem] bg-card/40 border border-muted hover:bg-card hover:border-muted-foreground/30 transition-all backdrop-blur-sm hover:-translate-y-1"
                            >
                                <div className="p-4 rounded-2xl bg-muted/50 text-muted-foreground group-hover:bg-muted group-hover:text-foreground transition-colors">
                                    <WifiOff className="w-8 h-8" />
                                </div>
                                <div className="text-center space-y-1">
                                    <h3 className="font-bold text-base">Continue without login</h3>
                                    <p className="text-[10px] text-muted-foreground font-medium opacity-60">
                                        Local-only workspace, no cloud features
                                    </p>
                                </div>
                                <div className="flex items-center gap-1.5 text-[9px] font-bold text-muted-foreground/40 uppercase tracking-wider">
                                    <Globe className="w-3 h-3" />
                                    Fully offline • Data stays on device
                                </div>
                            </button>
                        </div>

                        {/* Device Flow Polling UI */}
                        {isPolling && userCode && (
                            <div className="w-full max-w-md p-6 rounded-2xl bg-card/60 border border-primary/30 text-center space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <p className="text-xs text-muted-foreground font-medium">Enter this code at GitHub:</p>
                                <div className="flex items-center justify-center gap-3">
                                    <span className="text-3xl font-black tracking-[0.3em] text-primary font-mono">{userCode}</span>
                                    <button onClick={handleCopyCode} className="p-2 rounded-lg hover:bg-muted/50 transition-colors" title="Copy code">
                                        {codeCopied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
                                    </button>
                                </div>
                                <button
                                    onClick={() => window.api.app.openExternal(verificationUri)}
                                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-muted/30 border border-muted/50 text-xs font-bold text-muted-foreground hover:text-primary hover:border-primary/40 transition-all"
                                >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                    Open GitHub
                                </button>
                                <div className="flex items-center justify-center gap-2 pt-2">
                                    <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                                    <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider">Waiting for authorization...</span>
                                </div>
                            </div>
                        )}

                        {authExpired && (
                            <p className="text-[10px] text-amber-500 font-bold">Code expired. Click "Sign in with GitHub" to try again.</p>
                        )}
                        {authError && (
                            <p className="text-xs text-destructive font-bold">{authError}</p>
                        )}

                        <RecentWorkspaces />
                    </div>
                )}

                {/* ========== LOGGED-IN SETUP STEP ========== */}
                {step === 'logged-in-setup' && (
                    <div className="flex flex-col items-center gap-8 animate-in fade-in duration-500">
                        <PageHeader />

                        {/* Account Switcher */}
                        <div className="relative">
                            <button
                                onClick={() => setShowAccountMenu(!showAccountMenu)}
                                className="flex items-center gap-4 px-6 py-3 rounded-full bg-card/50 border border-muted/50 backdrop-blur-sm hover:border-primary/40 transition-all"
                            >
                                {githubUser && (
                                    <>
                                        <img src={githubUser.avatar_url} alt="" className="w-8 h-8 rounded-full" />
                                        <div className="text-left">
                                            <div className="text-sm font-bold">{githubUser.name || githubUser.login}</div>
                                            <div className="text-[10px] text-muted-foreground font-medium">@{githubUser.login}</div>
                                        </div>
                                        <ChevronRight className={`w-4 h-4 text-muted-foreground ml-2 transition-transform ${showAccountMenu ? 'rotate-90' : ''}`} />
                                    </>
                                )}
                            </button>

                            {/* Account Dropdown */}
                            {showAccountMenu && (
                                <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 w-72 bg-card border border-muted rounded-2xl shadow-2xl shadow-black/30 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                                    <div className="p-2 space-y-1">
                                        {accounts.map(acc => (
                                            <div key={acc.login} className={`flex items-center gap-3 p-3 rounded-xl transition-all ${acc.login === activeLogin ? 'bg-primary/10 border border-primary/30' : 'hover:bg-muted/50 border border-transparent'}`}>
                                                <img src={acc.avatar_url} alt="" className="w-7 h-7 rounded-full" />
                                                <div className="flex-1 overflow-hidden">
                                                    <div className="text-xs font-bold truncate">{acc.name || acc.login}</div>
                                                    <div className="text-[9px] text-muted-foreground font-medium">@{acc.login}</div>
                                                </div>
                                                {acc.login === activeLogin ? (
                                                    <div className="flex items-center gap-1">
                                                        <Check className="w-3.5 h-3.5 text-primary" />
                                                        <button onClick={() => logout(acc.login)} className="p-1.5 rounded-lg hover:bg-destructive/10 hover:text-destructive transition-colors" title="Sign out">
                                                            <LogOut className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-1">
                                                        <button onClick={() => switchAccount(acc.login)} className="px-3 py-1 rounded-lg bg-muted/50 text-[9px] font-bold hover:bg-primary/10 hover:text-primary transition-colors">
                                                            Switch
                                                        </button>
                                                        <button onClick={() => logout(acc.login)} className="p-1.5 rounded-lg hover:bg-destructive/10 hover:text-destructive transition-colors" title="Sign out">
                                                            <LogOut className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                    <div className="border-t border-muted/30 p-2">
                                        <button
                                            onClick={() => { setShowAccountMenu(false); startDeviceFlow(); }}
                                            className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors text-xs font-bold text-muted-foreground hover:text-primary"
                                        >
                                            <Plus className="w-4 h-4" />
                                            Add another account
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Device Flow Polling UI (for "Add another account") */}
                        {isPolling && userCode && (
                            <div className="w-full max-w-md p-6 rounded-2xl bg-card/60 border border-primary/30 text-center space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <p className="text-xs text-muted-foreground font-medium">Enter this code at GitHub:</p>
                                <div className="flex items-center justify-center gap-3">
                                    <span className="text-3xl font-black tracking-[0.3em] text-primary font-mono">{userCode}</span>
                                    <button onClick={handleCopyCode} className="p-2 rounded-lg hover:bg-muted/50 transition-colors" title="Copy code">
                                        {codeCopied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
                                    </button>
                                </div>
                                <button
                                    onClick={() => window.api.app.openExternal(verificationUri)}
                                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-muted/30 border border-muted/50 text-xs font-bold text-muted-foreground hover:text-primary hover:border-primary/40 transition-all"
                                >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                    Open GitHub
                                </button>
                                <div className="flex items-center justify-center gap-2 pt-2">
                                    <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                                    <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider">Waiting for authorization...</span>
                                </div>
                            </div>
                        )}
                        {authError && (
                            <p className="text-xs text-destructive font-bold">{authError}</p>
                        )}

                        {/* Actions */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-2xl">
                            <button
                                onClick={() => {
                                    setWorkspaceOrigin('logged-in');
                                    setStep('create-repo');
                                    setWizardStep(1);
                                }}
                                className="group flex flex-col items-center gap-5 p-8 rounded-[2rem] bg-card/40 border border-muted hover:bg-card hover:border-primary/40 transition-all backdrop-blur-sm hover:-translate-y-1"
                            >
                                <div className="p-4 rounded-2xl bg-muted/50 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                                    <Plus className="w-8 h-8" />
                                </div>
                                <div className="text-center space-y-1">
                                    <h3 className="font-bold text-base">Create New Workspace</h3>
                                    <p className="text-[10px] text-muted-foreground font-medium opacity-60">
                                        New GitHub repository with workspace template
                                    </p>
                                </div>
                            </button>

                            <button
                                onClick={() => {
                                    setStep('pick-repo');
                                    loadRepos();
                                }}
                                className="group flex flex-col items-center gap-5 p-8 rounded-[2rem] bg-card/40 border border-muted hover:bg-card hover:border-primary/40 transition-all backdrop-blur-sm hover:-translate-y-1"
                            >
                                <div className="p-4 rounded-2xl bg-muted/50 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                                    <Github className="w-8 h-8" />
                                </div>
                                <div className="text-center space-y-1">
                                    <h3 className="font-bold text-base">Open Existing Repo</h3>
                                    <p className="text-[10px] text-muted-foreground font-medium opacity-60">
                                        Clone an existing GitHub repository
                                    </p>
                                </div>
                            </button>
                        </div>

                        <div className="w-full max-w-2xl">
                            <RecentWorkspaces />
                        </div>
                    </div>
                )}

                {/* ========== OFFLINE SETUP STEP ========== */}
                {step === 'offline-setup' && (
                    <div className="flex flex-col items-center gap-8 animate-in fade-in duration-500">
                        <PageHeader subtitle="Disconnected Mode" />
                        <BackButton to="auth-gate" label="Back to login" />

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-2xl">
                            <button
                                onClick={handleOpenFolder}
                                className="group flex flex-col items-center gap-5 p-8 rounded-[2rem] bg-card/40 border border-muted hover:bg-card hover:border-primary/40 transition-all backdrop-blur-sm hover:-translate-y-1"
                            >
                                <div className="p-4 rounded-2xl bg-muted/50 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                                    <FolderOpen className="w-8 h-8" />
                                </div>
                                <div className="text-center space-y-1">
                                    <h3 className="font-bold text-base">Open Existing Workspace</h3>
                                    <p className="text-[10px] text-muted-foreground font-medium opacity-60">
                                        Browse to a local .codex workspace
                                    </p>
                                </div>
                            </button>

                            <button
                                onClick={() => {
                                    setWorkspaceOrigin('offline');
                                    setStep('configure-workspace');
                                }}
                                className="group flex flex-col items-center gap-5 p-8 rounded-[2rem] bg-card/40 border border-muted hover:bg-card hover:border-primary/40 transition-all backdrop-blur-sm hover:-translate-y-1"
                            >
                                <div className="p-4 rounded-2xl bg-muted/50 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                                    <Plus className="w-8 h-8" />
                                </div>
                                <div className="text-center space-y-1">
                                    <h3 className="font-bold text-base">Create New Workspace</h3>
                                    <p className="text-[10px] text-muted-foreground font-medium opacity-60">
                                        Set up a new local workspace
                                    </p>
                                </div>
                            </button>
                        </div>

                        <div className="w-full max-w-2xl">
                            <RecentWorkspaces />
                        </div>
                    </div>
                )}

                {/* ========== CONFIGURE WORKSPACE STEP ========== */}
                {step === 'configure-workspace' && (
                    <div className="flex flex-col items-center gap-6 animate-in fade-in slide-in-from-right-8 duration-500">
                        <div className="w-full flex items-center justify-between">
                            <BackButton to={workspaceOrigin === 'logged-in' ? 'logged-in-setup' : 'offline-setup'} />
                            <h2 className="text-2xl font-bold">Configure Workspace</h2>
                            <div />
                        </div>

                        {/* Mode Toggle */}
                        <div className="flex bg-muted/40 p-1 rounded-xl self-center">
                            <button
                                onClick={() => setConfigMode('preset')}
                                className={`px-5 py-2 text-xs font-bold rounded-lg transition-all ${configMode === 'preset' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                            >
                                Blueprints
                            </button>
                            <button
                                onClick={() => setConfigMode('custom')}
                                className={`px-5 py-2 text-xs font-bold rounded-lg transition-all ${configMode === 'custom' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                            >
                                Create Your Own
                            </button>
                        </div>

                        {configMode === 'preset' ? (
                            <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-4">
                                {PRESETS.filter(p => p.id !== 'custom-builder').map(preset => (
                                    <button
                                        key={preset.id}
                                        onClick={() => handleCreateFromPreset(preset)}
                                        className="group relative flex flex-col p-6 rounded-[1.5rem] border border-muted bg-card/60 hover:bg-card hover:border-primary/40 transition-all text-left space-y-4"
                                    >
                                        <div className="p-3 rounded-xl bg-muted/50 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary w-fit transition-colors">
                                            <DynamicIcon name={preset.icon} className="w-6 h-6" />
                                        </div>
                                        <div className="space-y-1 flex-1">
                                            <div className="flex items-center justify-between">
                                                <h3 className="font-bold">{preset.name}</h3>
                                                <span className="text-[9px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-black uppercase tracking-wider">
                                                    {preset.category}
                                                </span>
                                            </div>
                                            <p className="text-xs text-muted-foreground/80 leading-relaxed font-medium">
                                                {preset.description}
                                            </p>
                                        </div>
                                        <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 transition-all">
                                            <div className="bg-primary/10 text-primary p-1.5 rounded-lg">
                                                <ChevronRight className="w-4 h-4" />
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        ) : (
                            /* Custom Entry Type Selection */
                            <div className="w-full space-y-6">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                    {Object.values(DEFAULT_WORKSPACE_CONFIG.entries).map(type => (
                                        <button
                                            key={type.type}
                                            onClick={() => toggleEntry(type.type)}
                                            className={`flex items-center gap-4 p-5 rounded-2xl border transition-all text-left ${selectedEntries.has(type.type) ? 'bg-primary/10 border-primary shadow-[0_0_20px_rgba(59,130,246,0.1)]' : 'bg-card/40 border-muted hover:border-muted-foreground'}`}
                                        >
                                            <div className={`p-3 rounded-xl ${selectedEntries.has(type.type) ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                                                <DynamicIcon name={type.icon} className="w-6 h-6" />
                                            </div>
                                            <div className="flex-1 overflow-hidden">
                                                <h4 className="font-bold text-sm truncate">{type.label}</h4>
                                                <p className="text-[10px] text-muted-foreground font-medium truncate">{type.description}</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                                <div className="flex items-center justify-between pt-4 border-t border-muted/30">
                                    <p className="text-xs text-muted-foreground font-medium">
                                        <strong>{selectedEntries.size}</strong> types selected
                                    </p>
                                    <button onClick={handleCreateCustom} className="px-8 py-3 rounded-2xl bg-primary text-primary-foreground font-black text-sm hover:bg-primary/90 transition-all active:scale-95 shadow-lg shadow-primary/20">
                                        CREATE WORKSPACE
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ========== CREATE REPO WIZARD ========== */}
                {step === 'create-repo' && (
                    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-right-8 duration-500">
                        <div className="flex items-center justify-between">
                            <BackButton to="logged-in-setup" />
                            <h2 className="text-2xl font-bold">New Repository</h2>
                            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Step {wizardStep} of 3</p>
                        </div>

                        {/* Step Indicator */}
                        <div className="flex gap-2">
                            {[1, 2, 3].map(s => (
                                <div key={s} className={`h-1.5 rounded-full flex-1 transition-all duration-500 ${s <= wizardStep ? 'bg-primary' : 'bg-muted/30'}`} />
                            ))}
                        </div>

                        <div className="max-w-lg w-full mx-auto">
                            {wizardStep === 1 ? (
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-1 text-left">
                                            <h3 className="text-xl font-bold">Workspace Template</h3>
                                            <p className="text-xs text-muted-foreground font-medium">Choose a blueprint or build your own.</p>
                                        </div>
                                        {/* Mode Toggle */}
                                        <div className="flex bg-muted/40 p-1 rounded-xl">
                                            <button
                                                onClick={() => setConfigMode('preset')}
                                                className={`px-4 py-1.5 text-[10px] font-bold rounded-lg transition-all ${configMode === 'preset' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                                            >
                                                Blueprints
                                            </button>
                                            <button
                                                onClick={() => setConfigMode('custom')}
                                                className={`px-4 py-1.5 text-[10px] font-bold rounded-lg transition-all ${configMode === 'custom' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                                            >
                                                Custom
                                            </button>
                                        </div>
                                    </div>

                                    {configMode === 'preset' ? (
                                        <div className="grid grid-cols-1 gap-2 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                                            {PRESETS.filter(p => p.id !== 'custom-builder').map(preset => (
                                                <button
                                                    key={preset.id}
                                                    onClick={() => setSelectedPreset(preset)}
                                                    className={`flex items-center gap-4 p-4 rounded-2xl border transition-all text-left ${selectedPreset?.id === preset.id ? 'bg-primary/10 border-primary shadow-lg shadow-primary/5' : 'bg-card/40 border-muted hover:border-muted-foreground/50 opacity-70'}`}
                                                >
                                                    <div className={`p-2.5 rounded-xl transition-colors ${selectedPreset?.id === preset.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                                                        <DynamicIcon name={preset.icon} className="w-5 h-5" />
                                                    </div>
                                                    <div className="flex-1 overflow-hidden">
                                                        <h4 className="font-bold text-xs">{preset.name}</h4>
                                                        <p className="text-[9px] text-muted-foreground font-medium truncate opacity-70">{preset.description}</p>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                                {Object.values(DEFAULT_WORKSPACE_CONFIG.entries).map(type => (
                                                    <button
                                                        key={type.type}
                                                        onClick={() => toggleEntry(type.type)}
                                                        className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${selectedEntries.has(type.type) ? 'bg-primary/10 border-primary' : 'bg-card/40 border-muted hover:border-muted-foreground'}`}
                                                    >
                                                        <div className={`p-2 rounded-lg ${selectedEntries.has(type.type) ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                                                            <DynamicIcon name={type.icon} className="w-4 h-4" />
                                                        </div>
                                                        <div className="flex-1 overflow-hidden">
                                                            <h4 className="font-bold text-[11px] truncate">{type.label}</h4>
                                                            <p className="text-[9px] text-muted-foreground font-medium truncate">{type.description}</p>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                            <p className="text-[10px] text-muted-foreground font-medium px-1"><strong>{selectedEntries.size}</strong> types selected</p>
                                        </div>
                                    )}
                                </div>
                            ) : wizardStep === 2 ? (
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 text-left">
                                    <div className="space-y-2">
                                        <h3 className="text-xl font-bold">Project Identity</h3>
                                        <p className="text-xs text-muted-foreground font-medium">Name your workspace.</p>
                                    </div>
                                    <div className="space-y-5">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-[0.2em] px-1">Repo Name</label>
                                            <input
                                                type="text"
                                                placeholder="my-workspace"
                                                value={repoName}
                                                onChange={(e) => setRepoName(e.target.value)}
                                                className="w-full bg-card/60 border border-muted/60 rounded-2xl px-5 py-4 text-sm focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-bold"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-[0.2em] px-1">Description</label>
                                            <input
                                                type="text"
                                                placeholder="Optional context for your project"
                                                value={repoDesc}
                                                onChange={(e) => setRepoDesc(e.target.value)}
                                                className="w-full bg-card/60 border border-muted/60 rounded-2xl px-5 py-4 text-sm focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-medium"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-[0.2em] px-1">Visibility</label>
                                            <div className="flex gap-4">
                                                <button onClick={() => setIsPrivate(false)} className={`flex-1 py-4 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${!isPrivate ? 'bg-primary/10 border-primary text-primary' : 'bg-card/40 border-muted opacity-60'}`}>Public</button>
                                                <button onClick={() => setIsPrivate(true)} className={`flex-1 py-4 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${isPrivate ? 'bg-primary/10 border-primary text-primary' : 'bg-card/40 border-muted opacity-60'}`}>Private</button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 text-left">
                                    <div className="space-y-2">
                                        <h3 className="text-xl font-bold">Connect & Launch</h3>
                                        <p className="text-xs text-muted-foreground font-medium">Choose where to store your project locally.</p>
                                    </div>

                                    {/* GitHub Auth Status */}
                                    {authStatus === 'success' && githubUser ? (
                                        <div className="flex items-center gap-4 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30">
                                            <img src={githubUser.avatar_url} alt="" className="w-10 h-10 rounded-full" />
                                            <div className="flex-1 min-w-0">
                                                <div className="font-bold text-sm text-emerald-400 truncate">{githubUser.name || githubUser.login}</div>
                                                <div className="text-[10px] text-muted-foreground font-medium truncate">@{githubUser.login}</div>
                                            </div>
                                            <Check className="w-5 h-5 text-emerald-500 shrink-0" />
                                        </div>
                                    ) : (
                                        <button
                                            onClick={startDeviceFlow}
                                            className="w-full flex items-center justify-center gap-3 p-4 rounded-2xl bg-card/60 border border-muted/60 hover:border-primary/40 hover:bg-card transition-all group"
                                        >
                                            <Github className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                                            <span className="font-bold text-sm">Sign in with GitHub</span>
                                        </button>
                                    )}

                                    {/* Local Path */}
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-[0.2em] px-1">Local Filesystem</label>
                                        <div className="flex gap-3">
                                            <input
                                                type="text"
                                                readOnly
                                                placeholder="Select folder..."
                                                value={localPath}
                                                className="flex-1 bg-card/60 border border-muted/60 rounded-2xl px-5 py-4 text-sm focus:outline-none cursor-default backdrop-blur-sm font-medium"
                                            />
                                            <button onClick={() => handleBrowsePath(setLocalPath)} className="px-5 rounded-2xl border border-muted/80 bg-muted/20 hover:bg-muted/40 transition-all text-[10px] font-black uppercase tracking-widest">
                                                Browse
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {createError && wizardStep === 3 && (
                                <div className="mt-4 p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-bold">{createError}</div>
                            )}

                            {/* Navigation */}
                            <div className="mt-8 flex items-center justify-between gap-4">
                                {wizardStep > 1 ? (
                                    <button onClick={() => setWizardStep(s => s - 1)} className="px-8 py-4 rounded-2xl border border-muted-foreground/20 hover:bg-muted/10 transition-all font-black text-[10px] uppercase tracking-[0.2em]">
                                        Back
                                    </button>
                                ) : <div />}

                                {wizardStep < 3 ? (
                                    <button
                                        disabled={wizardStep === 1 && !selectedPreset || wizardStep === 2 && !repoName}
                                        onClick={() => setWizardStep(s => s + 1)}
                                        className="px-10 py-4 rounded-2xl bg-foreground text-background font-black text-[10px] uppercase tracking-[0.2em] hover:bg-foreground/90 transition-all shadow-xl disabled:opacity-20 active:scale-95"
                                    >
                                        Continue
                                    </button>
                                ) : (
                                    <button
                                        onClick={handleCreateRemoteRepo}
                                        disabled={isCreating || !localPath || authStatus !== 'success'}
                                        className="px-10 py-4 rounded-[1.5rem] bg-primary text-primary-foreground font-black text-[10px] uppercase tracking-[0.2em] hover:bg-primary/90 transition-all shadow-2xl shadow-primary/20 disabled:opacity-30 flex items-center gap-3 active:scale-95"
                                    >
                                        {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                        {isCreating ? 'Creating...' : 'Initialize'}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* ========== PICK EXISTING REPO STEP ========== */}
                {step === 'pick-repo' && (
                    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-right-8 duration-500">
                        <div className="flex items-center justify-between">
                            <BackButton to="logged-in-setup" />
                            <h2 className="text-2xl font-bold">Your Repositories</h2>
                            <div />
                        </div>

                        {/* Search */}
                        <div className="relative max-w-md mx-auto w-full">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Search repositories..."
                                value={repoSearchQuery}
                                onChange={(e) => setRepoSearchQuery(e.target.value)}
                                className="w-full bg-card/60 border border-muted/60 rounded-2xl pl-11 pr-5 py-3 text-sm focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all"
                            />
                        </div>

                        {reposLoading ? (
                            <div className="flex items-center justify-center py-16">
                                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                                <span className="ml-3 text-sm text-muted-foreground font-medium">Loading repositories...</span>
                            </div>
                        ) : (
                            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                {filteredRepos.map(repo => (
                                    <button
                                        key={repo.full_name}
                                        onClick={() => setSelectedRepo(repo)}
                                        className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all text-left ${selectedRepo?.full_name === repo.full_name ? 'bg-primary/10 border-primary' : 'bg-card/40 border-muted hover:border-muted-foreground/50'}`}
                                    >
                                        <div className={`p-2.5 rounded-xl transition-colors ${selectedRepo?.full_name === repo.full_name ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                                            {repo.private ? <Lock className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <h4 className="font-bold text-sm truncate">{repo.full_name}</h4>
                                                {repo.topics?.includes('citadel-workspace') && (
                                                    <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-primary/20 text-primary font-black uppercase tracking-wider shrink-0">Citadel</span>
                                                )}
                                            </div>
                                            {repo.description && (
                                                <p className="text-[10px] text-muted-foreground font-medium truncate opacity-70">{repo.description}</p>
                                            )}
                                        </div>
                                        <ChevronRight className={`w-4 h-4 transition-opacity ${selectedRepo?.full_name === repo.full_name ? 'opacity-100 text-primary' : 'opacity-0'}`} />
                                    </button>
                                ))}
                                {filteredRepos.length === 0 && !reposLoading && (
                                    <div className="text-center py-12 text-muted-foreground text-sm">
                                        {repoSearchQuery ? 'No repositories match your search.' : 'No repositories found.'}
                                    </div>
                                )}
                            </div>
                        )}

                        {selectedRepo && (
                            <div className="space-y-4 border-t border-muted/30 pt-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-[0.2em] px-1">Clone to Local Folder</label>
                                    <div className="flex gap-3">
                                        <input
                                            type="text"
                                            readOnly
                                            placeholder="Select destination..."
                                            value={clonePath}
                                            className="flex-1 bg-card/60 border border-muted/60 rounded-2xl px-5 py-3 text-sm focus:outline-none cursor-default backdrop-blur-sm font-medium"
                                        />
                                        <button onClick={() => handleBrowsePath(setClonePath)} className="px-5 rounded-2xl border border-muted/80 bg-muted/20 hover:bg-muted/40 transition-all text-[10px] font-black uppercase tracking-widest">
                                            Browse
                                        </button>
                                    </div>
                                </div>

                                {createError && (
                                    <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-bold">{createError}</div>
                                )}

                                <button
                                    onClick={handleCloneRepo}
                                    disabled={isCloning || !clonePath}
                                    className="w-full py-4 rounded-[1.5rem] bg-primary text-primary-foreground font-black text-sm hover:bg-primary/90 transition-all shadow-xl shadow-primary/20 disabled:opacity-30 flex items-center justify-center gap-3 active:scale-95"
                                >
                                    {isCloning ? <Loader2 className="w-5 h-5 animate-spin" /> : <FolderOpen className="w-5 h-5" />}
                                    {isCloning ? 'Cloning...' : 'Clone & Open'}
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* ========== CLONE REMOTE STEP ========== */}
                {step === 'clone-remote' && (
                    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-right-8 duration-500">
                        <div className="flex items-center justify-between">
                            <BackButton to="auth-gate" label="Cancel" />
                            <h2 className="text-2xl font-bold">Import Repository</h2>
                            <div />
                        </div>

                        <div className="max-w-lg w-full mx-auto space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-[0.2em] px-1">Source URL</label>
                                <input
                                    type="text"
                                    readOnly
                                    value={remoteUrlToClone}
                                    className="w-full bg-card/60 border border-muted/60 rounded-2xl px-5 py-3 text-sm focus:outline-none cursor-default font-mono text-muted-foreground"
                                />
                            </div>

                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-[0.2em] px-1">Import Method</label>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <button
                                        onClick={() => setCloneMethod('clone')}
                                        className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all ${cloneMethod === 'clone' ? 'bg-primary/10 border-primary text-primary' : 'bg-card/40 border-muted hover:border-muted-foreground/50'}`}
                                    >
                                        <Copy className="w-5 h-5" />
                                        <span className="text-[11px] font-bold">Standard Clone</span>
                                        <span className="text-[9px] text-muted-foreground font-medium text-center">Keeps remote origin</span>
                                    </button>
                                    <button
                                        onClick={() => setCloneMethod('fork')}
                                        className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all ${cloneMethod === 'fork' ? 'bg-primary/10 border-primary text-primary' : 'bg-card/40 border-muted hover:border-muted-foreground/50'}`}
                                    >
                                        <GitBranch className="w-5 h-5" />
                                        <span className="text-[11px] font-bold">Fork & Clone</span>
                                        <span className="text-[9px] text-muted-foreground font-medium text-center">Creates copy on your GitHub</span>
                                    </button>
                                    <button
                                        onClick={() => setCloneMethod('disconnected')}
                                        className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all ${cloneMethod === 'disconnected' ? 'bg-primary/10 border-primary text-primary' : 'bg-card/40 border-muted hover:border-muted-foreground/50'}`}
                                    >
                                        <WifiOff className="w-5 h-5" />
                                        <span className="text-[11px] font-bold">Disconnected</span>
                                        <span className="text-[9px] text-muted-foreground font-medium text-center">Removes remote origin</span>
                                    </button>
                                </div>
                            </div>

                            {(cloneMethod === 'clone' || cloneMethod === 'fork') && (
                                <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                                    <div className="flex items-center justify-between px-1">
                                        <label className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-[0.2em]">GitHub Account</label>
                                        {cloneMethod === 'fork' && (
                                            <span className="text-[9px] text-primary bg-primary/10 px-2 py-0.5 rounded-full font-bold">Required</span>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        {accounts.map(acc => (
                                            <button
                                                key={acc.login}
                                                onClick={() => setSelectedCloneAccount(acc.login)}
                                                className={`w-full flex items-center gap-4 p-3 rounded-2xl border transition-all ${selectedCloneAccount === acc.login ? 'bg-primary/10 border-primary shadow-sm' : 'bg-card/40 border-muted hover:border-muted-foreground/50 opacity-70'}`}
                                            >
                                                <img src={acc.avatar_url} alt="" className="w-8 h-8 rounded-full" />
                                                <div className="flex-1 text-left min-w-0">
                                                    <div className="font-bold text-sm truncate">{acc.name || acc.login}</div>
                                                    <div className="text-[10px] text-muted-foreground font-medium truncate">@{acc.login}</div>
                                                </div>
                                                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${selectedCloneAccount === acc.login ? 'border-primary' : 'border-muted-foreground/30'}`}>
                                                    {selectedCloneAccount === acc.login && <div className="w-2 h-2 rounded-full bg-primary" />}
                                                </div>
                                            </button>
                                        ))}
                                        {cloneMethod === 'clone' && (
                                            <button
                                                onClick={() => setSelectedCloneAccount(null)}
                                                className={`w-full flex items-center gap-4 p-3 rounded-2xl border transition-all ${selectedCloneAccount === null ? 'bg-primary/10 border-primary shadow-sm' : 'bg-card/40 border-muted hover:border-muted-foreground/50 opacity-70'}`}
                                            >
                                                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                                                    <Github className="w-4 h-4 text-muted-foreground" />
                                                </div>
                                                <div className="flex-1 text-left min-w-0">
                                                    <div className="font-bold text-sm truncate">Anonymous (No Auth)</div>
                                                    <div className="text-[10px] text-muted-foreground font-medium truncate">Read-only access for public repos</div>
                                                </div>
                                                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${selectedCloneAccount === null ? 'border-primary' : 'border-muted-foreground/30'}`}>
                                                    {selectedCloneAccount === null && <div className="w-2 h-2 rounded-full bg-primary" />}
                                                </div>
                                            </button>
                                        )}
                                        {accounts.length === 0 && cloneMethod === 'fork' && (
                                            <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-bold text-center">
                                                You must link a GitHub account by going back to sign in to fork repositories.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div className="space-y-4 border-t border-muted/30 pt-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-[0.2em] px-1">Save to Local Folder</label>
                                    <div className="flex gap-3">
                                        <input
                                            type="text"
                                            readOnly
                                            placeholder="Select destination..."
                                            value={cloneRemotePath}
                                            className="flex-1 bg-card/60 border border-muted/60 rounded-2xl px-5 py-3 text-sm focus:outline-none cursor-default backdrop-blur-sm font-medium"
                                        />
                                        <button onClick={() => handleBrowsePath(setCloneRemotePath)} className="px-5 rounded-2xl border border-muted/80 bg-muted/20 hover:bg-muted/40 transition-all text-[10px] font-black uppercase tracking-widest">
                                            Browse
                                        </button>
                                    </div>
                                </div>

                                {cloneRemoteError && (
                                    <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-bold">{cloneRemoteError}</div>
                                )}

                                <button
                                    onClick={handleCloneRemoteRepo}
                                    disabled={isCloningRemote || !cloneRemotePath || (cloneMethod === 'fork' && !selectedCloneAccount)}
                                    className="w-full py-4 rounded-[1.5rem] bg-primary text-primary-foreground font-black text-sm hover:bg-primary/90 transition-all shadow-xl shadow-primary/20 disabled:opacity-30 flex items-center justify-center gap-3 active:scale-95"
                                >
                                    {isCloningRemote ? <Loader2 className="w-5 h-5 animate-spin" /> : <FolderOpen className="w-5 h-5" />}
                                    {isCloningRemote ? 'Processing...' : 'Start Import'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
