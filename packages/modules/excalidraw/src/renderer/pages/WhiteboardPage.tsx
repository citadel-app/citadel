import { useEffect, useState } from 'react';
import { Excalidraw, MainMenu, WelcomeScreen } from "@excalidraw/excalidraw";
import { useTheme } from 'next-themes';
import "@excalidraw/excalidraw/index.css";
import { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types';
import { useCoreServices } from '@citadel-app/ui';
import { CollaborationBar } from '../components/CollaborationBar';

export const WhiteboardPage = () => {
    const { resolvedTheme } = useTheme();
    const { vaultPath, storage } = useCoreServices();
    // P2P — uses the host's PeerContext (globally provided)
    const [excalidrawAPI, setExcalidrawAPI] = useState<ExcalidrawImperativeAPI | null>(null);
    const [mounted, setMounted] = useState(false);

    // Load library from workspace if it exists
    useEffect(() => {
        if (!excalidrawAPI || !vaultPath) return;

        const loadLibrary = async () => {
            try {
                const content = await storage.readFile('.codex/excalidraw/library.excalidrawlib');
                if (content) {
                    const data = JSON.parse(content);
                    if (data && data.libraryItems) {
                        excalidrawAPI.updateLibrary({
                            libraryItems: data.libraryItems,
                            openLibraryMenu: false
                        });
                        console.log(`[Whiteboard] Loaded ${data.libraryItems.length} items from workspace library.`);
                    }
                }
            } catch (error) {
                console.error('[Whiteboard] Failed to load workspace library:', error);
            }
        };

        loadLibrary();
    }, [excalidrawAPI, vaultPath, storage]);

    // Excalidraw is client-side only
    useEffect(() => {
        setMounted(true);
    }, []);

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
                    viewBackgroundColor: '#ffffff',
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
                            viewBackgroundColor: '#ffffff',
                            currentItemFontFamily: 1,
                        }
                    }}
                    onChange={(_elements, _appState, _files) => {
                        // P2P broadcasting will be added when PeerContext is accessible
                    }}
                >
                    <MainMenu>
                        <MainMenu.DefaultItems.Export />
                        <MainMenu.DefaultItems.SaveAsImage />
                        <MainMenu.DefaultItems.ClearCanvas />
                        <MainMenu.DefaultItems.Help />
                    </MainMenu>
                    <WelcomeScreen />
                </Excalidraw>
            </div>
        </div>
    );
};
