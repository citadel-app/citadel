/**
 * PeerContext — shared context for P2P communication.
 * The context and hook live in @citadel-app/ui so that modules can import usePeer().
 * The PeerProvider (which initializes peerService) lives in the host.
 */
import { createContext, useContext } from 'react';
import { type PeerMessage } from '@citadel-app/core';

export interface PeerContextType {
    status: 'connected' | 'disconnected' | 'error' | 'loading';
    peerId: string | null;
    connect: (remoteId: string) => Promise<boolean>;
    send: (remoteId: string, type: string, payload: any) => boolean;
    broadcast: (type: string, payload: any) => number;
    onMessage: (callback: (message: PeerMessage) => void) => () => void;
}

export const PeerContext = createContext<PeerContextType | null>(null);

export const usePeer = () => {
    const context = useContext(PeerContext);
    if (!context) {
        throw new Error('usePeer must be used within a PeerProvider');
    }
    return context;
};
