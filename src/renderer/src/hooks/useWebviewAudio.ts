import { useEffect, useId, useState, useCallback } from 'react';
import { useAudio } from '../context/AudioContext';

/**
 * Hook to synchronize a webview's audio state with the global AudioContext.
 * Returns a callback ref to be attached to the webview element.
 */
export const useWebviewAudio = () => {
    const id = useId();
    const { registerWebview, unregisterWebview, isMuted } = useAudio();
    const [webviewElement, setWebviewElement] = useState<any>(null);

    // Callback ref to capture the webview element when it mounts/unmounts
    const webviewCallbackRef = useCallback((node: any) => {
        if (node) {
            // Check if it's already ready (sometimes it might be)
            // But usually we wait for dom-ready
            node.addEventListener('dom-ready', () => {
                console.log(`[useWebviewAudio] Webview dom-ready for node:`, id);
                setWebviewElement(node);
            }, { once: true });
            
            // Return cleanup in case the callback is called again with a different node
            // or if we need to remove the listener.
            // Note: Callback refs don't support returning a cleanup function like useEffect.
            // However, we can track the node and listener if needed. 
            // For now, if the node is destroyed before dom-ready, the listener shouldn't fire anyway.
        } else {
            setWebviewElement(null);
        }
    }, [id]);

    useEffect(() => {
        if (!webviewElement) return;

        // Register the webview with our global context
        registerWebview(id, webviewElement);

        return () => {
            unregisterWebview(id);
        };
    }, [id, webviewElement, registerWebview, unregisterWebview]);

    return [webviewCallbackRef, webviewElement] as const;
};
