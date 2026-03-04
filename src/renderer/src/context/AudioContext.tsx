import { createContext, useContext, useState, ReactNode, useEffect, useCallback, useRef } from 'react';

interface AudioContextType {
    isAudible: boolean;
    isMuted: boolean;
    setMuted: (muted: boolean) => void;
    registerWebview: (id: string, element: any) => void;
    unregisterWebview: (id: string) => void;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export const AudioProvider = ({ children }: { children: ReactNode }) => {
    const [isAudible, setIsAudible] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const webviewsRef = useRef<Map<string, any>>(new Map());

    const setMuted = useCallback((muted: boolean) => {
        console.log(`[AudioContext] Setting global muted to: ${muted}`);
        setIsMuted(muted);
    }, []);

    const registerWebview = useCallback((id: string, element: any) => {
        console.log(`[AudioContext] Registering webview: ${id}`);
        webviewsRef.current.set(id, element);
        // Apply current mute state to new webview
        try {
            if (element && typeof element.setAudioMuted === 'function') {
                element.setAudioMuted(isMuted);
            }
        } catch (e) {
            console.warn(`[AudioContext] Failed to set initial mute state for ${id}:`, e);
        }
    }, [isMuted]);

    const unregisterWebview = useCallback((id: string) => {
        webviewsRef.current.delete(id);
    }, []);

    // Apply mute state to all webviews when it changes
    useEffect(() => {
        webviewsRef.current.forEach((webview, id) => {
            try {
                if (webview && typeof webview.setAudioMuted === 'function') {
                    webview.setAudioMuted(isMuted);
                }
            } catch (e) {
                console.warn(`[AudioContext] Failed to sync mute state for webview ${id}:`, e);
            }
        });
    }, [isMuted]);

    // Poll for audibility
    useEffect(() => {
        const checkAudibility = () => {
            let anyAudible = false;
            webviewsRef.current.forEach(webview => {
                try {
                    if (webview && typeof webview.isCurrentlyAudible === 'function') {
                        if (webview.isCurrentlyAudible()) {
                            anyAudible = true;
                        }
                    }
                } catch (e) {
                    // Webview might have been destroyed but not yet unregistered
                }
            });
            if (anyAudible !== isAudible) {
                setIsAudible(anyAudible);
            }
        };

        const interval = setInterval(checkAudibility, 1000);
        return () => clearInterval(interval);
    }, [isAudible]);

    return (
        <AudioContext.Provider value={{
            isAudible,
            isMuted,
            setMuted,
            registerWebview,
            unregisterWebview
        }}>
            {children}
        </AudioContext.Provider>
    );
};

export const useAudio = () => {
    const context = useContext(AudioContext);
    if (!context) {
        throw new Error('useAudio must be used within an AudioProvider');
    }
    return context;
};
