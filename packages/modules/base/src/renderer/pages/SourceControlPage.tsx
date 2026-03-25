import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useConfig } from '../context/ConfigContext';
import { useAppSettings } from '../context/AppSettingsContext';
import { useGit } from '../context/GitContext';
import { Icon } from '@citadel-app/ui';
import { DiffView } from '../components/DiffView';
import { SplitPaneLayout, SplitPaneProvider } from '@citadel-app/ui';
import { BranchManagerModal } from '../components/git/BranchManagerModal';
import { VirtualizedFileList, GitItem } from '@citadel-app/ui';
import { ConfirmDialog } from '@citadel-app/ui';
import { isModKey } from '@citadel-app/ui';
import { hostApi as __hostApi } from '../host-services';

export const SourceControlPage = () => {
    const { vaultPath, setVaultPath, config } = useConfig();
    const { settings: appSettings } = useAppSettings();
    const { status, isRepo, loading: gitLoading, refreshStatus } = useGit();

    const defaultRemote = config?.settings?.defaultRemote || appSettings.defaultRemote || 'origin';
    const defaultBranch = config?.settings?.defaultBranch || appSettings.defaultBranch || 'main';

    // Local state
    const [actionLoading, setActionLoading] = useState(false);
    const [commitMessage, setCommitMessage] = useState('');
    const [showAddRemote, setShowAddRemote] = useState(false);
    const [remoteName, setRemoteName] = useState(defaultRemote);
    const [remoteUrl, setRemoteUrl] = useState('');
    const [selectedFile, setSelectedFile] = useState<{ path: string, status: 'index' | 'working_dir', gitStatus?: string } | null>(null);
    const [isCloning, setIsCloning] = useState(false);
    const [cloneUrl, setCloneUrl] = useState('');
    const [showCloneInput, setShowCloneInput] = useState(false);
    const [showBranchModal, setShowBranchModal] = useState(false);
    const [containerHeight, setContainerHeight] = useState(500);
    const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
    const [fetchedRemotes, setFetchedRemotes] = useState<any[]>([]);

    // Dialog States
    const [discardDialog, setDiscardDialog] = useState<{ open: boolean, file: string | null }>({ open: false, file: null });
    const [discardAllDialog, setDiscardAllDialog] = useState(false);
    const [alertDialog, setAlertDialog] = useState<{ open: boolean, title: string, message: string }>({ open: false, title: '', message: '' });

    const listContainerRef = useRef<HTMLDivElement>(null);
    const isLoading = gitLoading || actionLoading;

    // Handlers
    const handleToggleSection = useCallback((sectionId: string) => {
        setCollapsedSections(prev => {
            const next = new Set(prev);
            if (next.has(sectionId)) next.delete(sectionId);
            else next.add(sectionId);
            return next;
        });
    }, []);

    // Monitor container height for virtualization
    useEffect(() => {
        if (!listContainerRef.current) return;
        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                setContainerHeight(entry.contentRect.height);
            }
        });
        resizeObserver.observe(listContainerRef.current);
        return () => resizeObserver.disconnect();
    }, []);

    // Fetch remotes
    useEffect(() => {
        if (!vaultPath || !isRepo) {
            setFetchedRemotes([]);
            return;
        }
        __hostApi.module.invoke('@citadel-app/base', 'git.getRemotes', vaultPath).then(remotes => {
            setFetchedRemotes(remotes || []);
        }).catch(console.error);
    }, [vaultPath, isRepo, status?.tracking, actionLoading]);

    // Handlers
    const handleClone = async () => {
        if (!cloneUrl) return;
        let target = vaultPath;
        if (!target) {
            const result = await __hostApi.dialog.openDirectory();
            if (!result) return;
            target = result;
        }

        setIsCloning(true);
        try {
            await __hostApi.module.invoke('@citadel-app/base', 'git.clone', cloneUrl, target);
            if (!vaultPath) setVaultPath(target);
            await refreshStatus();
            setShowCloneInput(false);
            setCloneUrl('');
        } catch (error) {
            console.error("Clone failed:", error);
            setAlertDialog({ open: true, title: 'Clone Failed', message: 'Clone failed. Check console for details.' });
        } finally {
            setIsCloning(false);
        }
    };

    const handleInit = async () => {
        if (!vaultPath) return;
        setActionLoading(true);
        try {
            await __hostApi.module.invoke('@citadel-app/base', 'git.init', vaultPath);
            await refreshStatus();
        } finally {
            setActionLoading(false);
        }
    };

    const handleStage = useCallback(async (file: string) => {
        if (!vaultPath) return;
        try {
            await __hostApi.module.invoke('@citadel-app/base', 'git.add', vaultPath, [file]);
            await refreshStatus();
            if (selectedFile?.path === file && selectedFile?.status === 'working_dir') {
                setSelectedFile(prev => prev ? { ...prev, status: 'index' } : null);
            }
        } catch (e) {
            console.error(e);
        }
    }, [vaultPath, refreshStatus, selectedFile]);

    const handleUnstage = useCallback(async (file: string) => {
        if (!vaultPath) return;
        try {
            await __hostApi.module.invoke('@citadel-app/base', 'git.unstage', vaultPath, [file]);
            await refreshStatus();
            if (selectedFile?.path === file && selectedFile?.status === 'index') {
                setSelectedFile(prev => prev ? { ...prev, status: 'working_dir' } : null);
            }
        } catch (e) {
            console.error(e);
        }
    }, [vaultPath, refreshStatus, selectedFile]);

    const handleDiscard = useCallback(async (file: string, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        if (!vaultPath) return;
        setDiscardDialog({ open: true, file });
    }, [vaultPath]);

    const confirmDiscard = async () => {
        if (!vaultPath || !discardDialog.file) return;
        try {
            await __hostApi.module.invoke('@citadel-app/base', 'git.discard', vaultPath, discardDialog.file);
            await refreshStatus();
            if (selectedFile?.path === discardDialog.file) setSelectedFile(null);
        } catch (e) {
            console.error(e);
        } finally {
            setDiscardDialog({ open: false, file: null });
        }
    };

    const handleStageAll = useCallback(async () => {
        if (!vaultPath) return;
        setActionLoading(true);
        try {
            await __hostApi.module.invoke('@citadel-app/base', 'git.add', vaultPath, ['.']);
            await refreshStatus();
        } finally {
            setActionLoading(false);
        }
    }, [vaultPath, refreshStatus]);

    const handleUnstageAll = useCallback(async () => {
        if (!vaultPath) return;
        setActionLoading(true);
        try {
            const stagedFiles = status?.files?.filter((f: any) => f.index !== ' ' && f.index !== '?') || [];
            if (stagedFiles.length === 0) return;
            await __hostApi.module.invoke('@citadel-app/base', 'git.unstage', vaultPath, stagedFiles.map(f => f.path));
            await refreshStatus();
        } finally {
            setActionLoading(false);
        }
    }, [vaultPath, status?.files, refreshStatus]);

    const handleDiscardAll = useCallback(async () => {
        setDiscardAllDialog(true);
    }, []);

    const confirmDiscardAll = async () => {
        if (!vaultPath) return;
        const changesFiles = status?.files?.filter((f: any) => f.working_dir !== ' ') || [];
        if (changesFiles.length === 0) return;

        setActionLoading(true);
        try {
            await __hostApi.module.invoke('@citadel-app/base', 'git.discardBulk', vaultPath, changesFiles.map(f => f.path));
            await refreshStatus();
            setSelectedFile(null);
        } finally {
            setActionLoading(false);
            setDiscardAllDialog(false);
        }
    };

    const handleCommit = async () => {
        if (!vaultPath || !commitMessage) return;
        setActionLoading(true);
        try {
            await __hostApi.module.invoke('@citadel-app/base', 'git.commit', vaultPath, commitMessage);
            setCommitMessage('');
            await refreshStatus();
        } finally {
            setActionLoading(false);
        }
    };

    const handleAddRemote = async () => {
        if (!vaultPath || !remoteName || !remoteUrl) return;
        try {
            await __hostApi.module.invoke('@citadel-app/base', 'git.addRemote', vaultPath, remoteName, remoteUrl);
            setShowAddRemote(false);
            setRemoteUrl('');
            setAlertDialog({ open: true, title: 'Success', message: 'Remote added successfully. You can now Sync.' });
        } catch (e: any) {
            console.error(e);
            setAlertDialog({ open: true, title: 'Error', message: "Failed to add remote: " + e.message });
        }
    };

    const handleSync = async () => {
        if (!vaultPath) return;
        setActionLoading(true);
        try {
            if (status?.tracking) {
                await __hostApi.module.invoke('@citadel-app/base', 'git.pull', vaultPath);
            }
            await __hostApi.module.invoke('@citadel-app/base', 'git.push', vaultPath);
            await refreshStatus();
        } catch (e: any) {
            const isHandledError = e.message && (e.message.includes('no tracking information') || e.message.includes('No remote configured') || e.message.includes('no upstream branch'));
            if (!isHandledError) console.error(e);

            if (isHandledError) {
                const remotes = await __hostApi.module.invoke('@citadel-app/base', 'git.getRemotes', vaultPath);
                if (!remotes || remotes.length === 0) {
                    setShowAddRemote(true);
                } else {
                    try {
                        await __hostApi.module.invoke('@citadel-app/base', 'git.push', vaultPath, remoteName, status?.current || defaultBranch);
                        setAlertDialog({ open: true, title: 'Success', message: "Pushed and set upstream to " + remoteName + "/" + (status?.current || defaultBranch) });
                        await refreshStatus();
                    } catch (pushError: any) {
                        setAlertDialog({ open: true, title: 'Sync Failed', message: "Sync failed: " + pushError.message });
                    }
                }
            } else {
                setAlertDialog({ open: true, title: 'Sync Failed', message: "Sync failed: " + e.message });
            }
        } finally {
            setActionLoading(false);
        }
    };

    // Memoized list of items for VirtualizedFileList
    const items = useMemo(() => {
        if (!status?.files) return [];
        const stagedFiles = status.files.filter((f: any) => f.index !== ' ' && f.index !== '?');
        const changesFiles = status.files.filter((f: any) => f.working_dir !== ' ');

        if (stagedFiles.length === 0 && changesFiles.length === 0) return [];

        const result: GitItem[] = [];

        if (stagedFiles.length > 0) {
            const isCollapsed = collapsedSections.has('staged');
            result.push({
                type: 'header',
                id: 'header-staged',
                label: 'Staged Changes',
                count: stagedFiles.length,
                isCollapsed,
                onToggle: () => handleToggleSection('staged'),
                bulkActionIcon: 'Minus',
                bulkActionTitle: 'Unstage All',
                onBulkAction: (e) => { e.stopPropagation(); handleUnstageAll(); }
            });

            if (!isCollapsed) {
                stagedFiles.forEach((f: any) => result.push({
                    type: 'file',
                    id: `staged-${f.path}`,
                    path: f.path,
                    index: f.index,
                    working_dir: f.working_dir,
                    section: 'index'
                }));
            }
        }

        if (changesFiles.length > 0) {
            const isCollapsed = collapsedSections.has('changes');
            result.push({
                type: 'header',
                id: 'header-changes',
                label: 'Changes',
                count: changesFiles.length,
                isCollapsed,
                onToggle: () => handleToggleSection('changes'),
                bulkActionIcon: 'Plus',
                bulkActionTitle: 'Stage All',
                onBulkAction: (e) => { e.stopPropagation(); handleStageAll(); },
                secondaryBulkActionIcon: 'RotateCcw',
                secondaryBulkActionTitle: 'Discard All Changes',
                onSecondaryBulkAction: (e) => { e.stopPropagation(); handleDiscardAll(); }
            });

            if (!isCollapsed) {
                changesFiles.forEach((f: any) => result.push({
                    type: 'file',
                    id: `changes-${f.path}`,
                    path: f.path,
                    index: f.index,
                    working_dir: f.working_dir,
                    section: 'working_dir'
                }));
            }
        }
        return result;
    }, [status?.files, handleUnstageAll, handleStageAll, handleDiscardAll, collapsedSections, handleToggleSection]);

    // UI Rendering Logic for different states
    if (!vaultPath) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4 text-center">
                <Icon name="FolderOpen" size={48} className="mb-4 opacity-50" />
                <h2 className="text-lg font-semibold mb-2 font-medieval">No Keep Open</h2>
                <p className="max-w-xs mb-4">Select a Keep to start using The Bastion.</p>
                <div className="flex gap-2">
                    <button
                        onClick={() => __hostApi.dialog.openDirectory().then(p => { if (p) setVaultPath(p); })}
                        className="bg-primary text-primary-foreground font-medium active:scale-95 btn-forged"
                    >
                        Open Keep
                    </button>
                    <button
                        onClick={() => setShowCloneInput(true)}
                        className="bg-secondary text-secondary-foreground font-medium active:scale-95 btn-forged"
                    >
                        Replicate Bastion
                    </button>
                </div>

                {showCloneInput && (
                    <div className="mt-6 w-full max-w-sm bg-muted/50 p-4 rounded-lg border border-border">
                        <h3 className="font-medium mb-2 text-foreground">Replicate Bastion</h3>
                        <input
                            type="text"
                            placeholder="https://github.com/username/repo.git"
                            className="w-full p-2 rounded bg-background border border-border mb-3 text-sm"
                            value={cloneUrl}
                            onChange={(e) => setCloneUrl(e.target.value)}
                        />
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setShowCloneInput(false)} className="px-3 py-1 text-xs hover:bg-muted rounded">Cancel</button>
                            <button
                                onClick={handleClone}
                                disabled={isCloning || !cloneUrl}
                                className="px-3 py-1 text-xs bg-primary text-primary-foreground rounded disabled:opacity-50 flex items-center gap-2"
                            >
                                {isCloning && <Icon name="RefreshCw" className="animate-spin" size={12} />}
                                {isCloning ? 'Replicating...' : 'Select Target & Replicate'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    if (isRepo === false) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4 text-center">
                <Icon name="GitBranch" size={48} className="mb-4 opacity-50" />
                <h2 className="text-lg font-semibold mb-2 font-medieval">No Bastion Found</h2>
                <p className="max-w-xs mb-4">The current Keep is not protected by a Bastion.</p>
                <div className="flex flex-col gap-3 w-full max-w-xs">
                    <button
                        onClick={handleInit}
                        className="bg-primary text-primary-foreground font-medium w-full active:scale-95 btn-forged"
                    >
                        Construct Bastion
                    </button>

                    <div className="relative flex items-center py-2">
                        <div className="flex-grow border-t border-border"></div>
                        <span className="flex-shrink-0 mx-4 text-xs">OR</span>
                        <div className="flex-grow border-t border-border"></div>
                    </div>

                    {!showCloneInput ? (
                        <button
                            onClick={() => setShowCloneInput(true)}
                            className="bg-secondary text-secondary-foreground hover:bg-secondary/80 px-4 py-2 rounded-md font-medium transition-colors w-full"
                        >
                            Replicate Bastion Here
                        </button>
                    ) : (
                        <div className="bg-muted/50 p-4 rounded-lg border border-border text-left">
                            <h3 className="font-medium mb-2 text-foreground text-sm">Replicate here?</h3>
                            <p className="text-xs mb-3">This will clone contents directly into <code>{vaultPath.split(/[/\\]/).pop()}</code>.</p>
                            <input
                                type="text"
                                placeholder="Repository URL"
                                className="w-full p-2 rounded bg-background border border-border mb-3 text-sm"
                                value={cloneUrl}
                                onChange={(e) => setCloneUrl(e.target.value)}
                            />
                            <div className="flex justify-end gap-2">
                                <button onClick={() => setShowCloneInput(false)} className="px-3 py-1 text-xs hover:bg-muted rounded">Cancel</button>
                                <button
                                    onClick={handleClone}
                                    disabled={isCloning || !cloneUrl}
                                    className="px-3 py-1 text-xs bg-primary text-primary-foreground rounded disabled:opacity-50 flex items-center gap-2"
                                >
                                    {isCloning && <Icon name="RefreshCw" className="animate-spin" size={12} />}
                                    Replicate
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    const LeftPanel = (
        <div className="flex flex-col h-full bg-background text-foreground overflow-hidden">
            <div className="h-12 border-b border-border flex items-center justify-between px-4 shrink-0 bg-muted/20">
                <div className="flex items-center gap-2 overflow-hidden text-sm">
                    <span className="font-semibold flex items-center gap-2 shrink-0 font-medieval">
                        <Icon name="GitBranch" size={16} />
                    </span>
                    <button
                        onClick={() => setShowBranchModal(true)}
                        className="text-xs bg-muted/50 hover:bg-muted px-2 py-1 rounded flex items-center gap-1.5 transition-colors border border-border/50"
                        title="Manage Branches"
                    >
                        <span className="max-w-[100px] truncate">{status?.current || defaultBranch}</span>
                        <Icon name="ChevronDown" size={10} className="opacity-50" />
                    </button>
                    {status?.tracking && (
                        <div className="flex items-center gap-2 ml-1 text-[10px] text-muted-foreground bg-muted/30 px-1.5 py-0.5 rounded border border-border/30">
                            <span className="flex items-center gap-1">
                                <Icon name="ArrowUp" size={10} /> {status.ahead}
                            </span>
                            <span className="flex items-center gap-1">
                                <Icon name="ArrowDown" size={10} /> {status.behind}
                            </span>
                        </div>
                    )}
                    {fetchedRemotes.length > 0 && (
                        <div className="flex items-center gap-1 ml-2 text-[10px] text-muted-foreground truncate max-w-[200px]" title={fetchedRemotes.find(r => r.name === defaultRemote)?.refs?.fetch || fetchedRemotes[0]?.refs?.fetch}>
                            <Icon name="Globe" size={10} className="shrink-0" />
                            <span className="truncate">
                                {(fetchedRemotes.find(r => r.name === defaultRemote)?.refs?.fetch || fetchedRemotes[0]?.refs?.fetch).replace(/^https?:\/\//, '').replace(/^git@github\.com:/, '')}
                            </span>
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={refreshStatus} className="p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors" title="Refresh">
                        <Icon name="RefreshCw" size={14} className={isLoading ? "animate-spin" : ""} />
                    </button>
                    <button onClick={handleSync} className="p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors" title="Bastion Sync (Pull & Push)">
                        <Icon name="RefreshCcw" size={14} />
                    </button>
                </div>
            </div>

            <div className="p-4 border-b border-border shrink-0 bg-muted/5 citadel-border m-2 rounded-lg">
                <textarea
                    className="w-full bg-input/50 border border-input rounded p-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary min-h-[80px] resize-none font-medieval"
                    placeholder={`Commit Message (${navigator.userAgent.includes('Mac') ? 'Cmd' : 'Ctrl'}+Enter to commit)`}
                    value={commitMessage}
                    onChange={(e) => setCommitMessage(e.target.value)}
                    onKeyDown={(e) => {
                        if (isModKey(e) && e.key === 'Enter') handleCommit();
                    }}
                />
                <button
                    onClick={handleCommit}
                    disabled={!commitMessage || isLoading || (status?.files?.length === 0)}
                    className="mt-2 w-full bg-primary text-primary-foreground py-1.5 font-medium active:scale-[0.98] btn-forged"
                >
                    {isLoading ? 'Processing...' : 'Commit'}
                </button>
            </div>

            <div ref={listContainerRef} className="flex-1 overflow-hidden relative group">
                {items.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground text-xs p-8 h-full">
                        <Icon name="Package" size={32} className="mb-2 opacity-20" />
                        No changes detected in the repository.
                    </div>
                ) : (
                    <VirtualizedFileList
                        items={items}
                        height={containerHeight}
                        onSelect={setSelectedFile}
                        selectedFile={selectedFile}
                        onAction={async (file) => {
                            const item = items.find(i => i.type === 'file' && i.path === file);
                            if (item?.type === 'file' && item.section === 'index') await handleUnstage(file);
                            else await handleStage(file);
                        }}
                        actionIcon={(section) => section === 'index' ? 'Minus' : 'Plus'}
                        actionTitle={(section) => section === 'index' ? 'Unstage' : 'Stage'}
                        onSecondaryAction={(file, e) => handleDiscard(file, e)}
                        secondaryActionIcon={(section) => section === 'working_dir' ? 'RotateCcw' : ''}
                        secondaryActionTitle={(section) => section === 'working_dir' ? 'Discard Changes' : ''}
                    />
                )}
            </div>

            {showAddRemote && (
                <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-card border border-border rounded-lg shadow-lg p-4 w-[300px]">
                        <h3 className="text-lg font-semibold mb-2">Add Remote</h3>
                        <p className="text-xs text-muted-foreground mb-4">No remote configured. Add one to sync.</p>
                        <div className="space-y-3">
                            <div>
                                <label className="text-xs font-medium block mb-1">Name</label>
                                <input
                                    className="w-full bg-input border border-input rounded px-2 py-1 text-sm"
                                    value={remoteName}
                                    onChange={(e) => setRemoteName(e.target.value)}
                                    placeholder="origin"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-medium block mb-1">URL</label>
                                <input
                                    className="w-full bg-input border border-input rounded px-2 py-1 text-sm"
                                    value={remoteUrl}
                                    onChange={(e) => setRemoteUrl(e.target.value)}
                                    placeholder="https://github.com/user/repo.git"
                                />
                            </div>
                            <div className="flex justify-end gap-2 mt-4">
                                <button onClick={() => setShowAddRemote(false)} className="px-3 py-1 text-xs hover:bg-muted rounded">Cancel</button>
                                <button onClick={handleAddRemote} className="px-3 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90">Add Remote</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    const RightPanel = !selectedFile ? (
        <div className="flex items-center justify-center h-full text-muted-foreground p-8 text-center bg-muted/5">
            <div className="flex flex-col items-center">
                <Icon name="FileCode" size={48} className="mb-4 opacity-20" />
                <h3 className="text-lg font-semibold mb-2">No File Selected</h3>
                <p className="text-sm">Select a file from the list to view changes.</p>
            </div>
        </div>
    ) : (
        <DiffView
            key={`${selectedFile.path}-${selectedFile.status}`}
            file={selectedFile.path}
            status={selectedFile.status}
            gitStatus={selectedFile.gitStatus}
            onClose={() => setSelectedFile(null)}
            onDiscard={selectedFile.status === 'working_dir' ? () => setDiscardDialog({ open: true, file: selectedFile.path }) : undefined}
            onSaveSuccess={refreshStatus}
        />
    );

    return (
        <div className="h-full w-full overflow-hidden relative">
            <SplitPaneProvider>
                <SplitPaneLayout
                    leftPanel={LeftPanel}
                    rightPanel={RightPanel}
                    defaultLeftSize={30}
                    minSize={20}
                    showLayoutControls={false}
                />
            </SplitPaneProvider>
            {showBranchModal && <BranchManagerModal onClose={() => setShowBranchModal(false)} />}

            <ConfirmDialog
                open={discardDialog.open}
                onOpenChange={(open) => setDiscardDialog(prev => ({ ...prev, open }))}
                title="Discard Changes?"
                description={`Are you sure you want to discard changes in ${discardDialog.file}? This cannot be undone.`}
                confirmLabel="Discard"
                variant="destructive"
                onConfirm={confirmDiscard}
            />

            <ConfirmDialog
                open={discardAllDialog}
                onOpenChange={setDiscardAllDialog}
                title="Discard ALL Changes?"
                description="Are you sure you want to discard ALL changes in the working directory? This cannot be undone."
                confirmLabel="Discard All"
                variant="destructive"
                onConfirm={confirmDiscardAll}
            />

            <ConfirmDialog
                open={alertDialog.open}
                onOpenChange={(open) => setAlertDialog(prev => ({ ...prev, open }))}
                title={alertDialog.title}
                description={alertDialog.message}
                confirmLabel="OK"
                cancelLabel={null}
                onConfirm={() => setAlertDialog(prev => ({ ...prev, open: false }))}
            />
        </div>
    );
};
