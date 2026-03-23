import Peer, { DataConnection } from 'peerjs';
import { type PeerMessage } from '@citadel-app/core';

export class PeerService {
    private peer: Peer | null = null;
    private connections: Map<string, DataConnection> = new Map();
    private onMessageCallbacks: ((message: PeerMessage) => void)[] = [];
    private onStatusCallbacks: ((status: 'connected' | 'disconnected' | 'error' | 'loading') => void)[] = [];

    constructor() {}

    public init(id: string, iceServers: { urls: string }[]) {
        if (this.peer) {
            this.peer.destroy();
        }

        console.log(`[PeerService] Initializing with ID: ${id}`);
        this.emitStatus('loading');

        this.peer = new Peer(id, {
            config: {
                iceServers: iceServers,
                sdpSemantics: 'unified-plan'
            },
            debug: 2
        });

        this.peer.on('open', (id) => {
            console.log(`[PeerService] Peer opened with ID: ${id}`);
            this.emitStatus('connected');
        });

        this.peer.on('connection', (conn) => {
            console.log(`[PeerService] Incoming connection from: ${conn.peer}`);
            this.setupConnection(conn);
        });

        this.peer.on('error', (err) => {
            console.error('[PeerService] Peer error:', err);
            this.emitStatus('error');
        });

        this.peer.on('disconnected', () => {
            console.warn('[PeerService] Peer disconnected');
            this.emitStatus('disconnected');
        });
    }

    private setupConnection(conn: DataConnection) {
        conn.on('open', () => {
            console.log(`[PeerService] Connection opened with: ${conn.peer}`);
            this.connections.set(conn.peer, conn);
        });

        conn.on('data', (data: any) => {
            console.log(`[PeerService] Data received from ${conn.peer}:`, data);
            if (typeof data === 'object' && data.type) {
                this.notifyMessage(data as PeerMessage);
            }
        });

        conn.on('close', () => {
            console.log(`[PeerService] Connection closed with: ${conn.peer}`);
            this.connections.delete(conn.peer);
        });

        conn.on('error', (err) => {
            console.error(`[PeerService] Connection error with ${conn.peer}:`, err);
        });
    }

    public async connect(remoteId: string): Promise<boolean> {
        if (!this.peer || !this.peer.open) {
            console.error('[PeerService] Cannot connect: Peer not initialized or not open');
            return false;
        }

        if (remoteId === this.peer.id) {
            console.warn('[PeerService] Cannot connect to self');
            return false;
        }

        if (this.connections.has(remoteId)) {
            console.log(`[PeerService] already connected to ${remoteId}`);
            return true;
        }

        return new Promise((resolve) => {
            console.log(`[PeerService] Connecting to: ${remoteId}`);
            const conn = this.peer!.connect(remoteId);
            
            const timeout = setTimeout(() => {
                console.warn(`[PeerService] Connection to ${remoteId} timed out`);
                resolve(false);
            }, 10000);

            conn.on('open', () => {
                clearTimeout(timeout);
                this.setupConnection(conn);
                resolve(true);
            });

            conn.on('error', (err) => {
                clearTimeout(timeout);
                console.error(`[PeerService] Failed to connect to ${remoteId}:`, err);
                resolve(false);
            });
        });
    }

    public send(remoteId: string, type: string, payload: any) {
        const conn = this.connections.get(remoteId);
        if (conn && conn.open) {
            const message: PeerMessage = {
                type,
                payload,
                senderId: this.peer?.id || ''
            };
            conn.send(message);
            return true;
        }
        console.warn(`[PeerService] Cannot send to ${remoteId}: No open connection`);
        return false;
    }

    public broadcast(type: string, payload: any) {
        let sentCount = 0;
        this.connections.forEach((conn, id) => {
            if (this.send(id, type, payload)) {
                sentCount++;
            }
        });
        return sentCount;
    }

    public onMessage(callback: (message: PeerMessage) => void) {
        this.onMessageCallbacks.push(callback);
        return () => {
            this.onMessageCallbacks = this.onMessageCallbacks.filter(c => c !== callback);
        };
    }

    public onStatus(callback: (status: 'connected' | 'disconnected' | 'error' | 'loading') => void) {
        this.onStatusCallbacks.push(callback);
        return () => {
            this.onStatusCallbacks = this.onStatusCallbacks.filter(c => c !== callback);
        };
    }

    private notifyMessage(message: PeerMessage) {
        this.onMessageCallbacks.forEach(cb => cb(message));
    }

    private emitStatus(status: 'connected' | 'disconnected' | 'error' | 'loading') {
        this.onStatusCallbacks.forEach(cb => cb(status));
    }

    public disconnect() {
        if (this.peer) {
            this.peer.destroy();
            this.peer = null;
            this.connections.clear();
            this.emitStatus('disconnected');
        }
    }
}

export const peerService = new PeerService();
