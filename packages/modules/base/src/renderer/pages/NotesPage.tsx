import { useState, useEffect, useRef } from 'react';
import { TiptapWrapper } from '@citadel-app/ui';
import { db } from '../lib/db';
import { Icon } from '@citadel-app/ui';
import { cn } from '@citadel-app/ui';
import { dataManager } from '../lib/data-manager';
import { useNavigate } from 'react-router-dom';
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    CitadelDialog,
    Button,
    Input
} from '@citadel-app/ui';
import { useToast } from '@citadel-app/ui';
import { useConfig } from '../context/ConfigContext';
import { type EntryTypeConfig } from '@citadel-app/core';
import { hostApi as __hostApi } from '../host-services';

const mapNoteToSections = (content: string, typeConfig: EntryTypeConfig) => {
    const sections = typeConfig.sections || [];
    if (sections.length === 0) return content;

    const sectionMap: Record<string, string[]> = {};
    sections.forEach(s => { sectionMap[s.title.toLowerCase()] = []; });

    const lines = content.split('\n');
    let currentSection: string | null = null;
    const capturedBefore: string[] = [];

    lines.forEach(line => {
        const headerMatch = line.match(/^#+\s+(.+)$/);
        if (headerMatch) {
            const headerTitle = headerMatch[1].trim().toLowerCase();
            const matchedSection = sections.find(s => s.title.toLowerCase() === headerTitle);
            if (matchedSection) {
                currentSection = matchedSection.title.toLowerCase();
                return;
            }
        }

        if (currentSection) {
            sectionMap[currentSection].push(line);
        } else {
            capturedBefore.push(line);
        }
    });

    // If no section headers were found, or there's content before any header,
    // add it to the first section as per user requirement.
    if (capturedBefore.length > 0) {
        const firstSectionTitle = sections[0].title.toLowerCase();
        sectionMap[firstSectionTitle] = [...capturedBefore, ...sectionMap[firstSectionTitle]];
    }

    // Reconstruct with separators and headers
    return sections.map((s) => {
        const title = s.title;
        const body = sectionMap[title.toLowerCase()].join('\n').trim();
        // We add the header to clear demarcate sections in the resulting markdown
        return `# ${title}\n${body}`;
    }).join('\n\n---\n\n');
};

export const NotesPage = () => {
    const [content, setContent] = useState<string>('');
    const [title, setTitle] = useState<string>(() => {
        return localStorage.getItem('notes-current-title') || '';
    });
    const { toast } = useToast();
    const { config } = useConfig();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isFullWidth, setIsFullWidth] = useState(() => {
        return localStorage.getItem('notes-full-width') === 'true';
    });
    const [isNameDialogOpen, setIsNameDialogOpen] = useState(false);
    const [pendingSaveType, setPendingSaveType] = useState<string | null>(null);
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const navigate = useNavigate();

    // Save preference
    useEffect(() => {
        localStorage.setItem('notes-full-width', isFullWidth.toString());
    }, [isFullWidth]);

    useEffect(() => {
        localStorage.setItem('notes-current-title', title);
    }, [title]);

    // Initial Load (Ephemeral)
    useEffect(() => {
        setIsLoading(false);
    }, []);

    // Change Handler (Ephemeral)
    const handleContentChange = (newContent: string) => {
        setContent(newContent);
    };

    const handleExportPdf = () => {
        window.print();
    };

    const handleSaveToCodex = async (typeKey: string) => {
        if (!content || !content.trim()) {
            toast('Note is empty', { type: 'error' });
            return;
        }

        if (!title.trim()) {
            setPendingSaveType(typeKey);
            setIsNameDialogOpen(true);
            return;
        }

        const typeConfig = config.entries[typeKey];
        if (!typeConfig) {
            toast('Invalid entry type', { type: 'error' });
            return;
        }

        setIsSaving(true);
        try {
            const entryTitle = title.trim() || 'Untitled Note';
            const mappedContent = mapNoteToSections(content, typeConfig);

            const entry = await dataManager.createEntry({
                type: typeKey as any,
                title: entryTitle,
                content: mappedContent
            });

            toast(`Saved to Codex as ${typeConfig.label}`, { type: 'success' });
            // Optionally clear or redirect
            // setContent('');
            // setTitle('');
        } catch (error) {
            console.error('Failed to save to Codex:', error);
            toast('Failed to save to Codex', { type: 'error' });
        } finally {
            setIsSaving(false);
            setIsNameDialogOpen(false);
            setPendingSaveType(null);
        }
    };

    const handleExportMd = async () => {
        if (!content || !content.trim()) {
            toast('Note is empty', { type: 'error' });
            return;
        }

        try {
            const downloadsPath = await __hostApi.app.getDownloadsPath();
            const fileName = (title.trim() || 'Untitled_Note').replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.md';
            const fullPath = `${downloadsPath}/${fileName}`;

            await __hostApi.module.invoke('@citadel-app/base', 'fs.writeFile', fullPath, content);
            toast(`Exported to ${fileName} in Downloads`, { type: 'success' });
        } catch (error) {
            console.error('Failed to export Markdown:', error);
            toast('Failed to export Markdown', { type: 'error' });
        }
    };

    if (isLoading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col h-full bg-background overflow-hidden notes-page">
            <CitadelDialog
                open={isNameDialogOpen}
                onOpenChange={setIsNameDialogOpen}
                title="Name your Note"
                description="Give your thoughts a name to bind them to the Codex."
                maxWidth="sm"
            >
                <div className="space-y-4">
                    <Input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g. The Ledger of Secrets"
                        autoFocus
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && title.trim() && pendingSaveType) {
                                handleSaveToCodex(pendingSaveType);
                            }
                        }}
                    />
                    <div className="flex justify-end gap-2">
                        <Button variant="ghost" onClick={() => setIsNameDialogOpen(false)}>Cancel</Button>
                        <Button
                            disabled={!title.trim() || isSaving}
                            onClick={() => pendingSaveType && handleSaveToCodex(pendingSaveType)}
                        >
                            {isSaving ? 'Binding...' : 'Bind to Codex'}
                        </Button>
                    </div>
                </div>
            </CitadelDialog>

            {/* Header / Toolbar */}
            <header className="h-12 border-b border-border flex items-center justify-between px-4 bg-muted/20 shrink-0 print:hidden">
                <div className="flex-1 flex items-center gap-4">
                    <div className="flex items-center gap-2 group">
                        <div className="p-1.5 rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary/20">
                            <Icon name="Feather" size={16} />
                        </div>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Untethered Thoughts..."
                            className="bg-transparent border-none outline-none text-sm font-medium placeholder:text-muted-foreground/50 w-64 focus:ring-0"
                        />
                    </div>
                    {isSaving && (
                        <span className="text-[10px] text-muted-foreground animate-pulse flex items-center gap-1">
                            <Icon name="RefreshCw" size={10} className="animate-spin" />
                            Binding...
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setIsFullWidth(!isFullWidth)}
                        className={cn(
                            "flex items-center gap-1.5 h-8 px-3 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all border",
                            isFullWidth
                                ? "bg-primary/10 border-primary text-primary"
                                : "bg-muted border-border text-muted-foreground hover:text-foreground hover:bg-muted/80"
                        )}
                        title={isFullWidth ? "Standard View" : "Full Width View"}
                    >
                        <Icon name={isFullWidth ? "Minimize2" : "Maximize2"} size={12} />
                    </button>

                    <div className="h-4 w-px bg-border mx-1" />

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className="flex items-center gap-1.5 h-8 px-3 text-[10px] font-black uppercase tracking-widest bg-muted border border-border text-muted-foreground rounded-lg hover:text-foreground hover:bg-muted/80 transition-all active:scale-95">
                                <Icon name="Save" size={12} />
                                Save
                                <Icon name="ChevronDown" size={10} className="opacity-50" />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56 max-h-[400px] overflow-y-auto custom-scrollbar">
                            <DropdownMenuLabel className="text-[10px] uppercase tracking-widest opacity-50">Choose Entry Type</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {Object.values(config.entries).map((entryType) => (
                                <DropdownMenuItem
                                    key={entryType.type}
                                    onClick={() => handleSaveToCodex(entryType.type)}
                                    className="gap-2 cursor-pointer"
                                >
                                    <Icon name={entryType.icon || 'FileText'} size={14} className={entryType.accentColor || 'text-muted-foreground'} />
                                    <div className="flex flex-col">
                                        <span className="text-sm font-medium">{entryType.label}</span>
                                        <span className="text-[9px] text-muted-foreground line-clamp-1">{entryType.description}</span>
                                    </div>
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className="flex items-center gap-1.5 h-8 px-3 text-[10px] font-black uppercase tracking-widest bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 active:scale-95">
                                <Icon name="Download" size={12} />
                                Export
                                <Icon name="ChevronDown" size={10} className="opacity-50" />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuLabel className="text-[10px] uppercase tracking-widest opacity-50">Local Export</DropdownMenuLabel>
                            <DropdownMenuItem onClick={handleExportMd} className="gap-2">
                                <Icon name="FileCode" size={14} className="text-blue-500" />
                                <span>Markdown (.md)</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={handleExportPdf} className="gap-2">
                                <Icon name="FileType" size={14} className="text-red-500" />
                                <span>Portable Document (.pdf)</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </header>

            {/* Editor Area */}
            <main className="flex-1 overflow-auto print:p-0 print:overflow-visible bg-muted/5 min-h-0">
                <div className={cn(
                    "mx-auto flex flex-col print:max-w-none transition-all duration-300 ease-in-out",
                    isFullWidth ? "w-full max-w-none" : "max-w-5xl w-full"
                )}>
                    <TiptapWrapper
                        content={content}
                        onChange={handleContentChange}
                        className="flex-1 border-none shadow-none bg-transparent"
                    />
                </div>
            </main>

            {/* Print Styles */}
            <style dangerouslySetInnerHTML={{
                __html: `
                @media print {
                    @page {
                        margin: 2cm;
                    }
                    body * {
                        visibility: hidden !important;
                    }
                    .notes-page, .notes-page main, .notes-page main *, 
                    .notes-page .ProseMirror, .notes-page .ProseMirror * {
                        visibility: visible !important;
                    }
                    .notes-page {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                        background: white !important;
                        color: black !important;
                    }
                    .notes-page header {
                        display: none !important;
                    }
                    .notes-page main {
                        padding: 0 !important;
                        margin: 0 !important;
                        background: transparent !important;
                    }
                    .notes-page .ProseMirror {
                        padding: 0 !important;
                        border: none !important;
                    }
                    .print\\:hidden {
                        display: none !important;
                    }
                }
            ` }} />
        </div>
    );
};
