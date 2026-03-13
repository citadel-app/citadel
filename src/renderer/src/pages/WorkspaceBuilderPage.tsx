import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FolderOpen, ChevronRight, Plus, Settings2, Code2, Github, Lock, Globe, Loader2 } from 'lucide-react';
import { useConfig } from '../context/ConfigContext';
import { PRESETS, type WorkspacePreset } from '@shared';
import { DEFAULT_WORKSPACE_CONFIG, type WorkspaceConfig, type EntryTypeConfig, type ModuleDefinition } from '@shared';
import { DynamicIcon } from '../components/IconRegistry';
import { EntryTypeList } from '../components/settings/EntryTypeList';
import { ModuleList } from '../components/settings/ModuleList';
import { dataManager } from '../lib/data-manager';
import { APP_CONSTANTS } from '@shared';
import Editor from '@monaco-editor/react';
import logoMain from '../assets/branding/banner-inverted.png';

type BuilderStep = 'choose-template' | 'configure' | 'finalize';
type GitHubAccount = { login: string; name: string | null; avatar_url: string; token: string };

export const WorkspaceBuilderPage: React.FC = () => {
    const navigate = useNavigate();
    const { setVaultPath } = useConfig();

    // Switch window to resizable builder mode on mount
    useEffect(() => {
        window.api.window.setupBuilder();
    }, []);

    const [step, setStep] = useState<BuilderStep>('choose-template');
    const [selectedPreset, setSelectedPreset] = useState<WorkspacePreset | null>(null);

    // Draft config state — this is the main data being edited
    const [draftConfig, setDraftConfig] = useState<WorkspaceConfig>(
        JSON.parse(JSON.stringify(DEFAULT_WORKSPACE_CONFIG))
    );

    const [editorMode, setEditorMode] = useState<'ui' | 'json'>('ui');
    const [json, setJson] = useState('');
    const [jsonError, setJsonError] = useState<string | null>(null);

    // Finalize state
    const [localPath, setLocalPath] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [createError, setCreateError] = useState<string | null>(null);

    // GitHub state
    const [githubAccount, setGithubAccount] = useState<GitHubAccount | null>(null);
    const [pushToGithub, setPushToGithub] = useState(false);
    const [repoName, setRepoName] = useState('');
    const [repoDesc, setRepoDesc] = useState('');
    const [isPrivate, setIsPrivate] = useState(true);
    const [creationStatus, setCreationStatus] = useState('');

    // Load GitHub account on mount
    useEffect(() => {
        const loadGitHub = async () => {
            try {
                const raw = await window.api.secrets.get('github_accounts');
                if (raw) {
                    const accounts: GitHubAccount[] = JSON.parse(raw);
                    const activePref = await window.api.secrets.get('github_active_login');
                    const active = accounts.find(a => a.login === activePref) || accounts[0];
                    if (active) {
                        setGithubAccount(active);
                        setPushToGithub(true);
                    }
                }
            } catch { /* no github, that's fine */ }
        };
        loadGitHub();
    }, []);

    // Sync JSON editor when switching to JSON mode
    useEffect(() => {
        if (editorMode === 'json') {
            setJson(JSON.stringify(draftConfig, null, 2));
            setJsonError(null);
        }
    }, [editorMode]);

    const handleSelectPreset = (preset: WorkspacePreset) => {
        setSelectedPreset(preset);
        setDraftConfig(JSON.parse(JSON.stringify(preset.config)));
        setStep('configure');
    };

    const handleStartFromScratch = () => {
        setSelectedPreset(null);
        setDraftConfig(JSON.parse(JSON.stringify(DEFAULT_WORKSPACE_CONFIG)));
        setStep('configure');
    };

    const handleUpdateEntries = (updatedEntries: Record<string, EntryTypeConfig>) => {
        setDraftConfig(prev => ({ ...prev, entries: updatedEntries }));
    };

    const handleUpdateModules = (updatedModules: Record<string, ModuleDefinition>) => {
        setDraftConfig(prev => ({ ...prev, modules: updatedModules }));
    };

    const handleJsonChange = (value: string | undefined) => {
        if (value === undefined) return;
        setJson(value);
        try {
            const parsed = JSON.parse(value);
            setDraftConfig(parsed);
            setJsonError(null);
        } catch (e: any) {
            setJsonError(e.message);
        }
    };

    const handleBrowsePath = async () => {
        const path = await window.api.dialog.openDirectory();
        if (path) setLocalPath(path);
    };

    const handleCreateWorkspace = async () => {
        if (!localPath) {
            setCreateError('Please choose a folder for your Keep.');
            return;
        }
        setIsCreating(true);
        setCreateError(null);
        try {
            await window.api.fs.allowPath(localPath);

            if (pushToGithub && githubAccount && repoName) {
                // --- GitHub flow: create repo, scaffold, push ---
                setCreationStatus('Creating GitHub repository...');
                const repoData = await window.api.github.createRepository(
                    githubAccount.token, repoName, repoDesc, isPrivate
                );

                setCreationStatus('Scaffolding Keep files...');
                await window.api.fs.scaffoldWorkspace(localPath, repoData.full_name, repoData.clone_url);
                await dataManager.createWorkspace(localPath, draftConfig);

                setCreationStatus('Initializing git repository...');
                await window.api.git.init(localPath);
                await window.api.git.setConfig(localPath, 'user.name', githubAccount.name || githubAccount.login);
                await window.api.git.setConfig(localPath, 'user.email', `${githubAccount.login}@users.noreply.github.com`);
                const authUrl = repoData.clone_url.replace('https://', `https://${githubAccount.token}@`);
                await window.api.git.addRemote(localPath, 'origin', authUrl);

                setCreationStatus('Committing and pushing...');
                await window.api.git.add(localPath, ['.']);
                await window.api.git.commit(localPath, 'Initial commit from Citadel');
                await window.api.git.push(localPath, 'origin', 'main');
            } else {
                // --- Local-only flow ---
                setCreationStatus('Creating Keep...');
                await dataManager.createWorkspace(localPath, draftConfig);
            }

            localStorage.setItem('codex-show-tour', 'true');
            navigate('/');
            await setVaultPath(localPath);
        } catch (e: any) {
            console.error('[WorkspaceBuilder] Creation failed:', e);
            setCreateError(e.message || 'Failed to establish Keep.');
            setCreationStatus('');
        } finally {
            setIsCreating(false);
        }
    };

    const handleBack = () => {
        if (step === 'finalize') {
            setStep('configure');
        } else if (step === 'configure') {
            setStep('choose-template');
        } else {
            navigate('/');
        }
    };

    const entryCount = Object.keys(draftConfig.entries).length;
    const moduleCount = Object.keys(draftConfig.modules || {}).length;

    return (
        <div
            className="flex flex-col h-screen bg-background text-foreground overflow-hidden font-outfit"
            style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
        >
            {/* Background */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-10">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/20 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-500/10 rounded-full blur-[120px]" />
            </div>

            {/* Header — draggable title bar */}
            <div
                className="flex items-center gap-4 px-6 py-4 border-b border-border/50 bg-background/80 backdrop-blur-sm shrink-0 z-20"
                style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
            >
                <button
                    onClick={handleBack}
                    className="flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-primary transition-colors uppercase tracking-wider"
                    style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
                >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Back
                </button>
                <div className="flex-1" />
                <img src={logoMain} alt="Citadel" className="h-6 object-contain opacity-50" />
                <div className="flex-1" />
                {step === 'configure' && (
                    <button
                        onClick={() => setStep('finalize')}
                        className="px-5 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:bg-primary/90 transition-all active:scale-95 shadow-lg shadow-primary/20"
                        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
                    >
                        Next: Choose Folder
                    </button>
                )}
            </div>

            {/* Body */}
            <div
                className="flex-1 overflow-y-auto p-6 z-10"
                style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
            >
                {/* ========== CHOOSE TEMPLATE ========== */}
                {step === 'choose-template' && (
                    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in duration-500">
                        <div className="text-center space-y-2">
                            <h2 className="text-2xl font-bold">Choose a Starting Layout</h2>
                            <p className="text-sm text-muted-foreground font-medium">
                                Pick a blueprint to start with, or build from scratch. You can customize everything in the next step.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {PRESETS.filter(p => p.id !== 'custom-builder').map(preset => (
                                <button
                                    key={preset.id}
                                    onClick={() => handleSelectPreset(preset)}
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
                                        <p className="text-[9px] text-muted-foreground/50 font-bold pt-1">
                                            {Object.keys(preset.config.entries).length} entry types
                                        </p>
                                    </div>
                                    <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 transition-all">
                                        <div className="bg-primary/10 text-primary p-1.5 rounded-lg">
                                            <ChevronRight className="w-4 h-4" />
                                        </div>
                                    </div>
                                </button>
                            ))}

                            {/* Start from Scratch */}
                            <button
                                onClick={handleStartFromScratch}
                                className="group flex flex-col items-center justify-center p-6 rounded-[1.5rem] border-2 border-dashed border-muted hover:border-primary/40 transition-all text-center space-y-3"
                            >
                                <div className="p-3 rounded-xl bg-muted/50 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                                    <Plus className="w-6 h-6" />
                                </div>
                                <div className="space-y-1">
                                    <h3 className="font-bold">Start from Scratch</h3>
                                    <p className="text-xs text-muted-foreground/80 font-medium">
                                        Full default config, fully customizable
                                    </p>
                                </div>
                            </button>
                        </div>
                    </div>
                )}

                {/* ========== CONFIGURE ========== */}
                {step === 'configure' && (
                    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-500">
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <h2 className="text-2xl font-bold">
                                    Configure Keep
                                    {selectedPreset && (
                                        <span className="text-sm font-medium text-muted-foreground ml-3">
                                            Based on "{selectedPreset.name}"
                                        </span>
                                    )}
                                </h2>
                                <p className="text-xs text-muted-foreground font-medium">
                                    {entryCount} entry types, {moduleCount} modules configured
                                </p>
                            </div>
                            <div className="flex bg-muted/40 p-1 rounded-xl">
                                <button
                                    onClick={() => setEditorMode('ui')}
                                    className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${editorMode === 'ui' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                                >
                                    <Settings2 className="w-3.5 h-3.5" />
                                    Visual Editor
                                </button>
                                <button
                                    onClick={() => setEditorMode('json')}
                                    className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${editorMode === 'json' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                                >
                                    <Code2 className="w-3.5 h-3.5" />
                                    JSON
                                </button>
                            </div>
                        </div>

                        {editorMode === 'ui' ? (
                            <div className="space-y-8">
                                <EntryTypeList
                                    entries={draftConfig.entries}
                                    onChange={handleUpdateEntries}
                                />
                                <div className="pt-4 border-t border-border mt-4">
                                    <ModuleList
                                        modules={draftConfig.modules || {}}
                                        onChange={handleUpdateModules}
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {jsonError && (
                                    <p className="text-xs text-destructive font-bold px-1">{jsonError}</p>
                                )}
                                <div className="border border-border rounded-xl overflow-hidden">
                                    <Editor
                                        height="500px"
                                        defaultLanguage="json"
                                        theme="vs-dark"
                                        value={json}
                                        onChange={handleJsonChange}
                                        options={{
                                            minimap: { enabled: false },
                                            fontSize: 12,
                                            wordWrap: 'on',
                                            scrollBeyondLastLine: false,
                                        }}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ========== FINALIZE ========== */}
                {step === 'finalize' && (
                    <div className="max-w-lg mx-auto space-y-6 animate-in fade-in duration-500">
                        <div className="text-center space-y-2">
                            <h2 className="text-2xl font-bold">Establish Keep</h2>
                            <p className="text-sm text-muted-foreground font-medium">
                                Choose a folder and optionally push to GitHub.
                            </p>
                        </div>

                        {/* Summary Card */}
                        <div className="p-5 rounded-2xl bg-card/60 border border-muted space-y-3">
                            <h3 className="text-xs font-black text-muted-foreground/60 uppercase tracking-[0.2em]">Keep Manifest</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Scroll Types</p>
                                    <p className="text-sm font-bold">{entryCount}</p>
                                    <div className="flex flex-wrap gap-1.5 pt-1">
                                        {Object.values(draftConfig.entries).slice(0, 5).map(e => (
                                            <span key={e.type} className="text-[9px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-bold">
                                                {e.label}
                                            </span>
                                        ))}
                                        {entryCount > 5 && (
                                            <span className="text-[9px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold">
                                                +{entryCount - 5} more
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Modules</p>
                                    <p className="text-sm font-bold">{moduleCount}</p>
                                    <div className="flex flex-wrap gap-1.5 pt-1">
                                        {Object.values(draftConfig.modules || {}).slice(0, 4).map(m => (
                                            <span key={m.id} className="text-[9px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-bold">
                                                {m.label}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Folder Picker */}
                        <div className="space-y-3">
                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
                                Keep Location
                            </label>
                            <button
                                onClick={handleBrowsePath}
                                className="w-full flex items-center gap-4 p-4 rounded-2xl border border-muted bg-card/40 hover:bg-card hover:border-primary/30 transition-all group"
                            >
                                <div className="p-2.5 rounded-xl bg-muted/50 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                                    <FolderOpen className="w-5 h-5" />
                                </div>
                                {localPath ? (
                                    <div className="overflow-hidden text-left flex-1">
                                        <p className="text-sm font-bold truncate">{localPath.split(/[\\/]/).pop()}</p>
                                        <p className="text-[9px] text-muted-foreground font-mono truncate">{localPath}</p>
                                    </div>
                                ) : (
                                    <p className="text-sm text-muted-foreground font-medium">Click to choose a folder...</p>
                                )}
                            </button>
                        </div>

                        {/* GitHub Integration */}
                        {githubAccount && (
                            <div className="space-y-4 p-5 rounded-2xl border border-muted bg-card/60">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <Github className="w-4 h-4 text-muted-foreground" />
                                        <div>
                                            <p className="text-xs font-bold">Push to GitHub</p>
                                            <p className="text-[9px] text-muted-foreground font-medium">
                                                Signed in as {githubAccount.login}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setPushToGithub(!pushToGithub)}
                                        className={`w-10 h-5 rounded-full transition-colors relative ${pushToGithub ? 'bg-primary' : 'bg-muted'}`}
                                    >
                                        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${pushToGithub ? 'translate-x-5' : 'translate-x-0.5'}`} />
                                    </button>
                                </div>

                                {pushToGithub && (
                                    <div className="space-y-3 pt-2 border-t border-border/50">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Repository Name</label>
                                            <input
                                                type="text"
                                                value={repoName}
                                                onChange={e => setRepoName(e.target.value.replace(/\s+/g, '-'))}
                                                placeholder="my-keep"
                                                className="w-full h-9 px-3 text-sm bg-background border border-input rounded-lg focus:border-primary outline-none"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Description (optional)</label>
                                            <input
                                                type="text"
                                                value={repoDesc}
                                                onChange={e => setRepoDesc(e.target.value)}
                                                placeholder="A Citadel Keep for..."
                                                className="w-full h-9 px-3 text-sm bg-background border border-input rounded-lg focus:border-primary outline-none"
                                            />
                                        </div>
                                        <button
                                            onClick={() => setIsPrivate(!isPrivate)}
                                            className="flex items-center gap-2 text-xs font-bold"
                                        >
                                            {isPrivate ? (
                                                <><Lock className="w-3.5 h-3.5 text-amber-500" /> Private</>
                                            ) : (
                                                <><Globe className="w-3.5 h-3.5 text-green-500" /> Public</>
                                            )}
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {createError && (
                            <p className="text-xs text-destructive font-bold text-center">{createError}</p>
                        )}

                        {isCreating && creationStatus && (
                            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground font-medium">
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                {creationStatus}
                            </div>
                        )}

                        <button
                            onClick={handleCreateWorkspace}
                            disabled={!localPath || isCreating || (pushToGithub && !repoName)}
                            className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-black text-sm hover:bg-primary/90 transition-all active:scale-[0.98] shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isCreating ? 'Establishing...' : pushToGithub ? 'Establish & Push to GitHub' : 'Establish Keep'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
