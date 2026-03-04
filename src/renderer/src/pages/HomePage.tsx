import { useState, useEffect, useMemo, useRef } from 'react';
import { Icon } from '../components/IconRegistry';
import { db, CodexEntry, ChatMessage, ChatSession } from '../lib/db';
import { dataManager } from '../lib/data-manager';
import { useNavigate } from 'react-router-dom';
import {
    intentService,
    chatService,
    ragService,
    providerRegistry,
    vectorService
} from '../ai';
import { useLiveQuery } from 'dexie-react-hooks';
import { useAppSettings } from '../context/AppSettingsContext';
import { cn } from '../lib/utils';
import { EntrySelectorDialog } from '../components/EntrySelectorDialog';
import { ChatMessageItem } from '../components/ChatMessageItem';
import { ChatInput } from '../components/ChatInput';
import { useConfig } from '../context/ConfigContext';
import { useLayout } from '../context/LayoutContext';
import logoMain from '../assets/branding/logo-main.png';
import logoOffline from '../assets/branding/logo-offline.png';

export const HomePage = () => {
    const navigate = useNavigate();
    const { settings } = useAppSettings();
    const { entryTypes } = useConfig();
    const { openCreateDialog } = useLayout();
    const isZen = settings?.zenMode;
    const [isSyncing, setIsSyncing] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
    const [isHistoryCollapsed, setIsHistoryCollapsed] = useState(false);
    const [selectedContextIds, setSelectedContextIds] = useState<Set<string>>(new Set());
    const [isSelectorOpen, setIsSelectorOpen] = useState(false);
    const [serviceStatus, setServiceStatus] = useState<{ ollama: boolean; qdrant: boolean }>({ ollama: true, qdrant: true });
    const abortRef = useRef(false);

    // Fetch all sessions for the sidebar
    const sessions = useLiveQuery(
        () => db.chatSessions.orderBy('updatedAt').reverse().toArray(),
        []
    );

    // Derived state: unique sources across the whole conversation
    const allSources = useMemo(() => {
        const entryMap = new Map<string, { id: string; type: string; title: string }>();
        chatMessages.forEach(msg => {
            msg.sources?.forEach(s => entryMap.set(s.id, s));
        });
        return Array.from(entryMap.values());
    }, [chatMessages]);

    // Service Health Check
    useEffect(() => {
        const checkHealth = async () => {
            if (settings?.ai?.enabled === false) {
                setServiceStatus({ ollama: false, qdrant: false });
                return;
            }
            // Use the active LLM provider for connection check
            const llm = providerRegistry.getLLMProvider();
            const llmConnected = await llm.checkConnection();
            let qdrantConnected = false;
            try {
                qdrantConnected = await vectorService.checkConnection();
            } catch (e) {
                console.warn('[HomePage] Vector service not available');
            }
            setServiceStatus({ ollama: llmConnected, qdrant: qdrantConnected });
        };
        checkHealth();
        const interval = setInterval(checkHealth, 15000);
        return () => clearInterval(interval);
    }, [settings?.ai?.enabled, settings?.ai?.provider, settings?.ai?.llmProvider, settings?.ai?.ollama?.baseUrl]);

    // Initial Sync
    useEffect(() => {
        const init = async () => {
            setIsSyncing(true);
            await dataManager.init();
            if (!currentSessionId && chatMessages.length === 0) {
                try {
                    const latestSession = await db.chatSessions.orderBy('updatedAt').reverse().first();
                    if (latestSession) {
                        setChatMessages(latestSession.messages);
                        setCurrentSessionId(latestSession.id);
                    } else {
                        setIsHistoryCollapsed(true);
                    }
                } catch (e) {
                    console.error('[HomePage] Failed to load session:', e);
                }
            }
            setIsSyncing(false);
        };
        init();
    }, []);

    // Session Persistence
    useEffect(() => {
        if (chatMessages.length === 0 && !currentSessionId) return;
        const saveSession = async () => {
            if (chatMessages.length === 0) return;
            const sessionId = currentSessionId || crypto.randomUUID();
            if (!currentSessionId) setCurrentSessionId(sessionId);
            const firstUserMsg = chatMessages.find(m => m.role === 'user');
            const title = firstUserMsg
                ? (firstUserMsg.content.slice(0, 40) + (firstUserMsg.content.length > 40 ? '...' : ''))
                : 'New Conversation';
            try {
                await db.chatSessions.put({
                    id: sessionId,
                    title,
                    messages: chatMessages,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                });
            } catch (e) {
                console.error('[HomePage] Auto-save failed:', e);
            }
        };
        const timer = setTimeout(saveSession, 1000);
        return () => clearTimeout(timer);
    }, [chatMessages, currentSessionId]);

    const handleSearch = async (query: string) => {
        if (!query.trim()) return;
        setIsGenerating(true);
        abortRef.current = false;
        setChatMessages(prev => [...prev, { role: 'user', content: query }]);
        setIsSearching(true);

        // Fetch manual context content
        let manualContext = "";
        if (selectedContextIds.size > 0) {
            const contextEntries = await Promise.all(Array.from(selectedContextIds).map(id => db.entries.get(id)));
            manualContext = contextEntries
                .filter(Boolean)
                .map(e => `[MANUAL CONTEXT: ${e!.title}]\n${e!.content || e!.frontmatter?.summary || ""}`)
                .join("\n\n---\n\n");
        }

        try {
            const intent = await intentService.analyze(query, entryTypes);

            // 1. Direct Navigation Intent (Strong match)
            if (intent.navigationIntent && intent.navigationIntent.confidence > 0.8) {
                const resolved = await intentService.resolveNavigation(intent.navigationIntent);
                if (resolved) {
                    navigate(resolved.url);
                    setIsGenerating(false);
                    setIsSearching(false);
                    return;
                }
            }

            const requiresContext = intent.requiresContext;
            let semanticContext = "";
            let sourceEntries: CodexEntry[] = [];

            if (requiresContext) {
                const results = await ragService.search(intent.searchQuery || query, 5);
                const uniqueEntryIds = [...new Set(results.map(r => r.entryId))];
                const entries = await Promise.all(uniqueEntryIds.map(id => db.entries.get(id)));
                sourceEntries = entries.filter(Boolean) as CodexEntry[];
                semanticContext = sourceEntries
                    .map(e => `[ENTRY ID: ${e.id} | TITLE: ${e.title}]\n${e.content || ""}`)
                    .join("\n\n---\n\n");
            }

            const fullContext = [manualContext, semanticContext].filter(Boolean).join("\n\n---\n\n");
            const history = chatMessages.map(m => ({ role: m.role, content: m.content }));

            const initialAssistantMsg: ChatMessage = {
                role: 'assistant',
                content: '',
                sources: sourceEntries.map(e => ({ id: e.id, title: e.title, type: e.type }))
            };
            setChatMessages(prev => [...prev, initialAssistantMsg]);

            await chatService.chatStream(
                intent.searchQuery || query,
                fullContext,
                history,
                (chunk) => {
                    setIsSearching(false);
                    setChatMessages(prev => {
                        const last = prev[prev.length - 1];
                        if (last && last.role === 'assistant') {
                            return [...prev.slice(0, -1), { ...last, content: (last.content as string) + chunk }];
                        }
                        return prev;
                    });
                },
                requiresContext
            );
        } catch (e) {
            console.error('[HomePage] Chat turn failed:', e);
        } finally {
            setIsGenerating(false);
            setIsSearching(false);
        }
    };

    const handleAbortChat = () => {
        abortRef.current = true;
        providerRegistry.getLLMProvider().abortChat();
        setIsGenerating(false);
        setIsSearching(false);
    };

    const handleClearChat = async () => {
        if (currentSessionId) await db.chatSessions.delete(currentSessionId);
        setChatMessages([]);
        setCurrentSessionId(null);
    };

    const handleNewChat = () => {
        setChatMessages([]);
        setCurrentSessionId(null);
    };

    const loadSession = (session: ChatSession) => {
        setChatMessages(session.messages);
        setCurrentSessionId(session.id);
    };

    const deleteSession = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        await db.chatSessions.delete(id);
        if (currentSessionId === id) {
            setChatMessages([]);
            setCurrentSessionId(null);
        }
    };

    const handleSelectMention = (entry: CodexEntry) => {
        setSelectedContextIds(prev => {
            const next = new Set(prev);
            next.add(entry.id);
            return next;
        });
    };

    return (
        <div className="flex h-full bg-background overflow-hidden relative">
            {/* Sidebar */}
            <div className={cn(
                "w-64 border-r border-border bg-muted/5 flex flex-col transition-all duration-300 ease-in-out relative",
                (isZen || isHistoryCollapsed) ? "w-0 opacity-0 overflow-hidden border-none" : "w-64 opacity-100"
            )}>
                <div className="p-4 border-b border-border flex items-center justify-between">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                        <Icon name="MessageSquare" size={14} />
                        Recent Chats
                    </h2>
                    <button onClick={handleNewChat} className="p-1 hover:bg-muted rounded transition-colors text-muted-foreground">
                        <Icon name="Plus" size={14} />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {sessions?.map(session => (
                        <div
                            key={session.id}
                            onClick={() => loadSession(session)}
                            className={cn(
                                "group relative p-3 rounded-lg cursor-pointer transition-all border",
                                currentSessionId === session.id
                                    ? 'bg-primary/10 text-primary border-primary/20'
                                    : 'hover:bg-muted text-muted-foreground border-transparent'
                            )}
                        >
                            <h3 className="text-xs font-medium truncate pr-6">{session.title}</h3>
                            <button
                                onClick={(e) => deleteSession(session.id, e)}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all"
                            >
                                <Icon name="Trash2" size={12} />
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Main Area */}
            <div className="flex-1 flex flex-col min-w-0 z-10 transition-all duration-300 relative">
                {!isZen && (
                    <button
                        onClick={() => setIsHistoryCollapsed(!isHistoryCollapsed)}
                        className="absolute left-2 top-4 z-50 p-2 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-all"
                    >
                        <Icon name={isHistoryCollapsed ? "PanelLeftOpen" : "PanelLeftClose"} size={18} />
                    </button>
                )}

                {/* Status Indicators */}
                <div className="absolute top-4 right-6 flex items-center gap-4 pointer-events-none z-50">
                    <div className={cn(
                        "flex items-center gap-2 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all",
                        serviceStatus.ollama ? "bg-green-500/5 text-green-500/70" : "bg-red-500/10 text-red-500 animate-pulse border border-red-500/20"
                    )}>
                        <div className={cn("w-1.5 h-1.5 rounded-full", serviceStatus.ollama ? "bg-green-500" : "bg-red-500")} />
                        AI: {serviceStatus.ollama ? 'Online' : 'Offline'}
                    </div>
                </div>

                {/* History Container */}
                <div className="flex-1 overflow-y-auto py-4 md:py-8">
                    <div className="max-w-4xl mx-auto px-6 space-y-6">
                        {chatMessages.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center space-y-4 md:space-y-8 pt-4 pb-12">
                                <img src={serviceStatus.ollama ? logoMain : logoOffline} alt="Citadel" className="w-16 h-16 md:w-20 md:h-20 object-contain transition-all duration-500" />
                                {!serviceStatus.ollama && (
                                    <button
                                        onClick={() => navigate('/settings/intelligence')}
                                        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-bold uppercase tracking-wider hover:bg-red-500/20 transition-all cursor-pointer"
                                    >
                                        <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                                        AI Offline — Configure
                                    </button>
                                )}
                                <div>
                                    <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-2 md:mb-4" style={{ fontFamily: "'Cinzel Decorative', serif" }}>Citadel</h1>
                                    <p className="text-muted-foreground max-w-lg text-sm md:text-lg mx-auto" style={{ fontFamily: "'Cinzel', serif" }}>Your technical knowledge base. Ask anything.</p>
                                </div>
                                <div className="w-full max-w-2xl mx-auto">
                                    <ChatInput
                                        variant="empty"
                                        isSearching={isSearching}
                                        onSearch={handleSearch}
                                        onAttachContext={() => setIsSelectorOpen(true)}
                                        hasContext={selectedContextIds.size > 0}
                                        onSelectMention={handleSelectMention}
                                    />
                                </div>
                            </div>
                        ) : (
                            chatMessages.map((msg, idx) => (
                                <ChatMessageItem
                                    key={idx}
                                    msg={msg}
                                    isZen={isZen}
                                    isLast={idx === chatMessages.length - 1}
                                    isGenerating={isGenerating}
                                />
                            ))
                        )}
                        {isGenerating && (
                            <div className="flex items-center gap-3 ml-2 text-muted-foreground animate-pulse">
                                <Icon name="Loader2" size={16} className="animate-spin" />
                                <span className="text-sm">Thinking...</span>
                                <button
                                    onClick={handleAbortChat}
                                    className="ml-2 px-2 py-1 bg-red-500/10 text-red-500 rounded text-[10px] font-bold uppercase border border-red-500/20 pointer-events-auto"
                                >
                                    Stop
                                </button>
                            </div>
                        )}
                        <div ref={(el) => el?.scrollIntoView({ behavior: 'smooth' })} />
                    </div>
                </div>

                {/* Fixed Bottom Input */}
                {chatMessages.length > 0 && (
                    <>
                        <div className="max-w-4xl mx-auto w-full px-6 pb-2">
                            {selectedContextIds.size > 0 && (
                                <div className="flex flex-wrap gap-2">
                                    {Array.from(selectedContextIds).map(id => (
                                        <div key={id} className="flex items-center gap-1.5 bg-primary/10 text-primary border border-primary/20 rounded px-2 py-1 text-[10px] font-bold transition-all">
                                            <Icon name="FileText" size={10} />
                                            <ContextEntryTitle id={id} />
                                            <button onClick={() => setSelectedContextIds(prev => {
                                                const n = new Set(prev); n.delete(id); return n;
                                            })}>
                                                <Icon name="X" size={10} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="border-t border-border/50 bg-background/50 backdrop-blur-sm py-4 md:py-6">
                            <div className="max-w-4xl mx-auto px-6">
                                <ChatInput
                                    variant="chat"
                                    isSearching={isSearching}
                                    onSearch={handleSearch}
                                    onAttachContext={() => setIsSelectorOpen(true)}
                                    hasContext={selectedContextIds.size > 0}
                                    onSelectMention={handleSelectMention}
                                    className={cn(isZen && "max-w-none")}
                                />
                            </div>
                        </div>
                        {!isZen && (
                            <div className="flex justify-center gap-4 md:gap-6 py-2 md:py-4 border-t border-border/10">
                                <button onClick={handleNewChat} className="flex items-center gap-2 text-[10px] font-bold uppercase text-muted-foreground hover:text-primary transition-all">
                                    <Icon name="Plus" size={12} /> New Chat
                                </button>
                                <button onClick={handleClearChat} className="flex items-center gap-2 text-[10px] font-bold uppercase text-red-500/70 hover:text-red-500 transition-all border-l border-border/20 pl-4 md:pl-6">
                                    <Icon name="Trash2" size={12} /> Delete Session
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Sidebar Sources */}
            {allSources.length > 0 && (
                <div className={cn(
                    "w-72 border-l border-border bg-muted/5 flex flex-col hidden xl:flex",
                    isZen && "hidden"
                )}>
                    <div className="p-4 border-b border-border font-bold text-xs uppercase text-muted-foreground tracking-widest">Sources</div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-2">
                        {allSources.map(entry => (
                            <div key={entry.id} onClick={() => navigate(`/${entry.type}/${entry.id}`)} className="p-2.5 rounded-lg border border-border bg-card hover:border-primary/50 transition-colors cursor-pointer text-xs font-semibold truncate leading-tight">
                                {entry.title}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <EntrySelectorDialog open={isSelectorOpen} onOpenChange={setIsSelectorOpen} selectedIds={selectedContextIds} onSelectionChange={setSelectedContextIds} />
        </div>
    );
};

const ContextEntryTitle = ({ id }: { id: string }) => {
    const entry = useLiveQuery(() => db.entries.get(id), [id]);
    return <>{entry?.title || "Loading..."}</>;
};
