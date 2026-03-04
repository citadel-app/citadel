import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAppSettings } from './AppSettingsContext';
import { peerService, PeerMessage } from '../lib/PeerService';

interface PeerContextType {
    status: 'connected' | 'disconnected' | 'error' | 'loading';
    peerId: string | null;
    connect: (remoteId: string) => Promise<boolean>;
    send: (remoteId: string, type: string, payload: any) => boolean;
    broadcast: (type: string, payload: any) => number;
    onMessage: (callback: (message: PeerMessage) => void) => () => void;
}

const PeerContext = createContext<PeerContextType | null>(null);

export const usePeer = () => {
    const context = useContext(PeerContext);
    if (!context) {
        throw new Error('usePeer must be used within a PeerProvider');
    }
    return context;
};

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
