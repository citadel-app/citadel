import { useEffect, useState, useRef } from 'react';
import { useConfig } from '../context/ConfigContext';
import { Icon } from '@citadel-app/ui';
import { appModuleRegistry } from '../host-services';
import { cn } from '@citadel-app/ui';
import { hostApi as __hostApi } from '../host-services';

interface DiffViewProps {
    file: string; // Relative path
    status: 'index' | 'working_dir';
    gitStatus?: string;
    onClose?: () => void;
    onDiscard?: () => void;
    onSaveSuccess?: () => void;
}

export const DiffView = ({ file, status, gitStatus, onClose, onDiscard, onSaveSuccess }: DiffViewProps) => {
    const { vaultPath } = useConfig();
    const [renderSideBySide, setRenderSideBySide] = useState(true);
    const [originalContent, setOriginalContent] = useState<string>('');
    const [modifiedContent, setModifiedContent] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isModified, setIsModified] = useState(false);
    const diffEditorRef = useRef<any>(null);
    const listenerRef = useRef<any>(null);

    const isCodexFile = file.includes('.codex');

    useEffect(() => {
        return () => {
            if (listenerRef.current) {
                listenerRef.current.dispose();
            }
        };
    }, []);

    useEffect(() => {
        if (diffEditorRef.current) {
            diffEditorRef.current.updateOptions({
                renderSideBySide: renderSideBySide
            });
        }
    }, [renderSideBySide]);

    useEffect(() => {
        let isMounted = true;

        const loadDiff = async () => {
            if (!vaultPath) return;

            // Basic binary check
            const binaryExts = ['pdf', 'png', 'jpg', 'jpeg', 'gif', 'ico', 'zip', 'tar', 'gz', 'mp4', 'mp3'];
            const ext = file.split('.').pop()?.toLowerCase();
            if (ext && binaryExts.includes(ext)) {
                if (isMounted) {
                    setError(`The file is not displayed in the text editor because it is either binary or uses an unsupported text encoding.`);
                    setLoading(false);
                }
                return;
            }

            if (isMounted) {
                setLoading(true);
                setError(null);
            }

            try {
                let original = '';
                let modified = '';

                if (status === 'index') {
                    // Staged changes
                    // If added (A), HEAD doesn't have it.
                    if (gitStatus === 'A') {
                        original = '';
                    } else {
                        original = await __hostApi.module.invoke('@citadel-app/base', 'git.show', vaultPath, `HEAD:${file}`).catch(() => '');
                    }
                    modified = await __hostApi.module.invoke('@citadel-app/base', 'git.show', vaultPath, `:${file}`).catch(() => '');
                } else {
                    // Unstaged changes (working dir)
                    // If untracked (?), index doesn't have it.
                    if (gitStatus === '?') {
                        original = '';
                    } else {
                        try {
                            original = await __hostApi.module.invoke('@citadel-app/base', 'git.show', vaultPath, `:${file}`);
                        } catch {
                            original = '';
                        }
                    }

                    // If deleted (D), FS doesn't have it.
                    if (gitStatus === 'D') {
                        modified = '';
                    } else {
                        try {
                            modified = await __hostApi.module.invoke('@citadel-app/base', 'fs.readFile', `${vaultPath}/${file}`);
                        } catch (e) {
                            console.error("Failed to read file from FS:", e);
                            modified = '';
                        }
                    }
                }

                if (isMounted) {
                    setOriginalContent(original);
                    setModifiedContent(modified);
                }
            } catch (e: any) {
                if (isMounted) {
                    console.error("Failed to load diff", e);
                    setError(e.message);
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        if (file && vaultPath) {
            loadDiff();
        }

        return () => {
            isMounted = false;
        };
    }, [file, status, gitStatus, vaultPath]);

    const getLanguage = (filename: string) => {
        const ext = filename.split('.').pop()?.toLowerCase();
        switch (ext) {
            case 'ts': case 'tsx': return 'typescript';
            case 'js': case 'jsx': return 'javascript';
            case 'json': return 'json';
            case 'md': return 'markdown';
            case 'css': return 'css';
            case 'html': return 'html';
            default: return 'plaintext';
        }
    };

    const handleEditorDidMount = (editor: any) => {
        diffEditorRef.current = editor;

        // Listen for changes in the modified editor
        const modifiedEditor = editor.getModifiedEditor();
        listenerRef.current = modifiedEditor.onDidChangeModelContent(() => {
            const currentContent = modifiedEditor.getValue();
            setModifiedContent(currentContent);
            setIsModified(currentContent !== modifiedContent);
        });
    };

    const handleSave = async () => {
        if (!vaultPath || isCodexFile || !isModified) return;

        setIsSaving(true);
        try {
            const fullPath = `${vaultPath}/${file}`;
            await __hostApi.module.invoke('@citadel-app/base', 'fs.writeFile', fullPath, modifiedContent);
            setIsModified(false);
            if (onSaveSuccess) onSaveSuccess();
        } catch (e: any) {
            console.error("Failed to save file:", e);
            setError(`Failed to save file: ${e.message}`);
        } finally {
            setIsSaving(false);
        }
    };

    const navigateDiff = (direction: 'next' | 'prev') => {
        if (!diffEditorRef.current) return;

        // Get line changes from the diff editor model
        // The model might be on the original or modified editor, usually available via getModel() on diff editor
        const model = diffEditorRef.current.getModel();
        if (!model) return;

        // We need line changes. In Monaco Diff Editor, usually we use getLineChanges() directly on the editor instance
        // But types might be tricky. Let's try direct access.
        const changes = diffEditorRef.current.getLineChanges();

        if (!changes || changes.length === 0) return;

        const modifiedEditor = diffEditorRef.current.getModifiedEditor();
        const currentLine = modifiedEditor.getPosition()?.lineNumber || 1;

        let targetChange;

        if (direction === 'next') {
            targetChange = changes.find((change: any) => change.modifiedStartLineNumber > currentLine);
            if (!targetChange) {
                // wrap around to first
                targetChange = changes[0];
            }
        } else {
            // Find last change before current line
            // Create a reversed copy of changes to search backwards
            targetChange = [...changes].reverse().find((change: any) => change.modifiedEndLineNumber < currentLine);
            if (!targetChange) {
                // wrap around to last
                targetChange = changes[changes.length - 1];
            }
        }

        if (targetChange) {
            // Reveal the change
            // We focus on the modified side
            modifiedEditor.setPosition({ lineNumber: targetChange.modifiedStartLineNumber, column: 1 });
            modifiedEditor.revealLineInCenter(targetChange.modifiedStartLineNumber);
            modifiedEditor.focus();
        }
    };

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-destructive p-4">
                <Icon name="AlertTriangle" size={64} className="mb-2 text-secondary-foreground" />
                <p className="text-center">{error}</p>
                <div className="mt-4 p-2 bg-muted rounded text-xs font-mono">
                    {file}
                </div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col">
            <div className="h-10 border-b border-border flex items-center justify-between px-4 bg-muted/30">
                <span className="font-mono text-sm truncate">{file}</span>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => navigateDiff('prev')}
                        disabled={loading}
                        className={`p-1 rounded transition-colors ${loading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-muted text-muted-foreground hover:text-foreground'}`}
                        title="Previous Change"
                    >
                        <Icon name="ArrowUp" size={16} />
                    </button>
                    <button
                        onClick={() => navigateDiff('next')}
                        disabled={loading}
                        className={`p-1 rounded transition-colors ${loading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-muted text-muted-foreground hover:text-foreground'}`}
                        title="Next Change"
                    >
                        <Icon name="ArrowDown" size={16} />
                    </button>
                    <div className="w-[1px] h-4 bg-border mx-1"></div>
                    <button
                        onClick={() => setRenderSideBySide(!renderSideBySide)}
                        className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"
                        title={renderSideBySide ? "Switch to Inline View" : "Switch to Side-by-Side View"}
                    >
                        <Icon name={renderSideBySide ? "Rows" : "Columns"} size={16} />
                    </button>

                    <div className="w-[1px] h-4 bg-border mx-1"></div>

                    <button
                        onClick={handleSave}
                        disabled={!isModified || isCodexFile || isSaving}
                        className={cn(
                            "p-1 rounded transition-colors",
                            isModified && !isCodexFile ? "text-primary hover:bg-primary/10" : "text-muted-foreground opacity-30 cursor-not-allowed"
                        )}
                        title={isCodexFile ? "Protected file (.codex)" : "Save Changes"}
                    >
                        <Icon name={isSaving ? "RefreshCw" : "Save"} size={16} className={cn(isSaving && "animate-spin")} />
                    </button>

                    {onDiscard && (
                        <>
                            <div className="w-[1px] h-4 bg-border mx-1"></div>
                            <button
                                onClick={onDiscard}
                                className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-destructive transition-colors"
                                title="Discard Changes"
                            >
                                <Icon name="RotateCcw" size={16} />
                            </button>
                        </>
                    )}

                    <div className="w-[1px] h-4 bg-border mx-1"></div>
                    <button onClick={onClose} className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground">
                        <Icon name="X" size={16} />
                    </button>
                </div>
            </div>
            <div className="flex-1 min-h-0 relative">
                {loading ? (
                    <div className="absolute inset-0 bg-background/50 backdrop-blur-sm z-10 flex items-center justify-center text-muted-foreground">
                        <Icon name="RefreshCw" className="animate-spin mr-2" /> Loading diff...
                    </div>
                ) : (
                    appModuleRegistry.getComponent('MonacoDiffWrapper') ? (
                        (() => {
                            const Comp = appModuleRegistry.getComponent('MonacoDiffWrapper') as any;
                            return <Comp
                                key={file}
                                className="h-full"
                                original={originalContent}
                                modified={modifiedContent}
                                language={getLanguage(file)}
                                onMount={handleEditorDidMount}
                                options={{
                                    renderSideBySide: renderSideBySide,
                                    readOnly: isCodexFile
                                }}
                            />;
                        })()
                    ) : (
                        <div className="flex h-full items-center justify-center text-muted-foreground p-4 text-center">
                            Failed to load Monaco Diff Viewer. Ensure the Code module is loaded.
                        </div>
                    )
                )}
            </div>
        </div>
    );
};
