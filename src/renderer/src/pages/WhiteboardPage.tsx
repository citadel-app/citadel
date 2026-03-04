import { useEffect, useState, useCallback, useRef } from 'react';
import { Excalidraw, MainMenu, WelcomeScreen } from "@excalidraw/excalidraw";
import { useTheme } from 'next-themes';
import "@excalidraw/excalidraw/index.css";
import { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types';
import { db } from '../lib/db';
import { debounce, throttle } from 'lodash';
import { useConfig } from '../context/ConfigContext';
import { usePeer } from '../context/PeerContext';
import { CollaborationBar } from '../components/whiteboard/CollaborationBar';

export const WhiteboardPage = () => {
    const { resolvedTheme } = useTheme();
    const { vaultPath } = useConfig();
    const { status, broadcast, onMessage } = usePeer();
    const [excalidrawAPI, setExcalidrawAPI] = useState<ExcalidrawImperativeAPI | null>(null);
    const [mounted, setMounted] = useState(false);

    // Ref to track if we are currently applying an update from a peer
    // to avoid broadcasting it back (infinite loop)
    const isApplyingUpdate = useRef(false);
    const lastBroadcastHash = useRef<string>('');

    // Load library from workspace if it exists
    useEffect(() => {
        if (!excalidrawAPI || !vaultPath) return;

        const loadLibrary = async () => {
            try {
                const libPath = `${vaultPath}/.codex/excalidraw/library.excalidrawlib`;
                const exists = await window.api.fs.exists(libPath);
                if (exists) {
                    console.log(`[Whiteboard] Loading workspace library from: ${libPath}`);
                    const content = await window.api.fs.readFile(libPath);
                    const data = JSON.parse(content);
                    if (data && data.libraryItems) {
                        excalidrawAPI.updateLibrary({
                            libraryItems: data.libraryItems,
                            openLibraryMenu: false // Better UX not to pop it open automatically
                        });
                        console.log(`[Whiteboard] Loaded ${data.libraryItems.length} items from workspace library.`);
                    }
                }
            } catch (error) {
                console.error('[Whiteboard] Failed to load workspace library:', error);
            }
        };

        loadLibrary();
    }, [excalidrawAPI, vaultPath]);

    // Handle Peer Messages
    useEffect(() => {
        if (!excalidrawAPI) return;

        const unsubscribe = onMessage((msg) => {
            if (msg.type === 'whiteboard-update') {
                console.log(`[Whiteboard] Received update from ${msg.senderId}`);
                isApplyingUpdate.current = true;

                // updateScene merges elements by ID
                excalidrawAPI.updateScene({
                    elements: msg.payload.elements,
                    appState: {
                        ...excalidrawAPI.getAppState(),
                        // Optionally sync parts of appState
                    }
                });

                // Allow some time for Excalidraw to process before enabling broadcast again
                setTimeout(() => {
                    isApplyingUpdate.current = false;
                }, 100);
            } else if (msg.type === 'whiteboard-sync-request') {
                console.log(`[Whiteboard] Sync request from ${msg.senderId}`);
                broadcast('whiteboard-update', {
                    elements: excalidrawAPI.getSceneElements(),
                    appState: excalidrawAPI.getAppState()
                });
            }
        });

        // Request sync from peers when we connect
        if (status === 'connected') {
            broadcast('whiteboard-sync-request', {});
        }

        return unsubscribe;
    }, [excalidrawAPI, status, broadcast, onMessage]);

    // Excalidraw is client-side only
    useEffect(() => {
        setMounted(true);
    }, []);

    // Broadcast changes (Throttled)
    const throttledBroadcast = useCallback(
        throttle((elements: any) => {
            if (isApplyingUpdate.current || status !== 'connected') return;

            // Simple hash check to avoid redundant broadcasts
            const hash = elements.length + '-' + elements[elements.length - 1]?.version;
            if (hash === lastBroadcastHash.current) return;
            lastBroadcastHash.current = hash;

            console.log('[Whiteboard] Broadcasting update...');
            broadcast('whiteboard-update', { elements });
        }, 100, { leading: true, trailing: true }),
        [status, broadcast]
    );

    const handleWhiteboardChange = useCallback(
        (elements: any, appState: any, files: any) => {
            throttledBroadcast(elements);
        },
        [throttledBroadcast]
    );

    // Update scene background when theme changes
    useEffect(() => {
        if (!excalidrawAPI) return;

        const isDark = resolvedTheme === 'dark';
        const themeMode = isDark ? 'dark' : 'light';

        const current = excalidrawAPI.getAppState();
        if (current.theme !== themeMode) {
            excalidrawAPI.updateScene({
                appState: {
                    ...current,
                    viewBackgroundColor: resolvedTheme === 'dark' ? '#ffffff' : '#ffffff',
                    theme: themeMode,
                }
            });
        }
    }, [resolvedTheme, excalidrawAPI]);

    if (!mounted) return null;

    return (
        <div className="h-full w-full flex flex-col bg-background relative">
            <CollaborationBar />

            <div className="h-full w-full" style={{ height: 'calc(100vh - 30px)' }}>
                <Excalidraw
                    excalidrawAPI={(api) => setExcalidrawAPI(api)}
                    theme={resolvedTheme === 'dark' ? 'dark' : 'light'}
                    initialData={{
                        appState: {
                            viewBackgroundColor: resolvedTheme === 'dark' ? '#1e1e1e' : '#ffffff',
                            currentItemFontFamily: 1,
                        }
                    }}
                    onChange={(elements, appState, files) => {
                        handleWhiteboardChange(elements, appState, files);
                    }}
                >
                    <MainMenu>
                        <MainMenu.DefaultItems.Export />
                        <MainMenu.DefaultItems.SaveAsImage />
                        <MainMenu.DefaultItems.ClearCanvas />
                        <MainMenu.DefaultItems.Help />
                        <MainMenu.DefaultItems.ChangeCanvasBackground />
                    </MainMenu>
                    <WelcomeScreen />
                </Excalidraw>
            </div>
        </div>
    );
};
