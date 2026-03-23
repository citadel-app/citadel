/**
 * PeerProvider — the host-side provider that initializes PeerService
 * and provides the PeerContext from @citadel-app/ui.
 * Modules import usePeer() from @citadel-app/ui, this provider sets the value.
 */
import { useEffect, useState, ReactNode } from 'react';
import { useAppSettings } from './AppSettingsContext';
import { peerService } from '../lib/PeerService';
import { PeerContext, type PeerContextType } from '@citadel-app/ui';

export const PeerProvider = ({ children }: { children: ReactNode }) => {
    const { settings } = useAppSettings();
    const [status, setStatus] = useState<'connected' | 'disconnected' | 'error' | 'loading'>('disconnected');

    useEffect(() => {
        if (settings.peerEnabled && settings.peerId) {
            peerService.init(settings.peerId, settings.peerIceServers || []);

            const removeStatusListener = peerService.onStatus((s) => setStatus(s));

            return () => {
                removeStatusListener();
                peerService.disconnect();
            };
        } else {
            peerService.disconnect();
            setStatus('disconnected');
        }
        return undefined;
    }, [settings.peerEnabled, settings.peerId, settings.peerIceServers]);

    const value: PeerContextType = {
        status,
        peerId: settings.peerId,
        connect: (remoteId) => peerService.connect(remoteId),
        send: (remoteId, type, payload) => peerService.send(remoteId, type, payload),
        broadcast: (type, payload) => peerService.broadcast(type, payload),
        onMessage: (callback) => peerService.onMessage(callback)
    };

    return (
        <PeerContext.Provider value={value}>
            {children}
        </PeerContext.Provider>
    );
};

// Re-export usePeer for backward compat with host code that imports from this file
export { usePeer } from '@citadel-app/ui';
