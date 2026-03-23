/**
 * CollaborationBar — Full P2P collaboration UI for Excalidraw.
 * Uses usePeer() from @citadel-app/ui (context provided by host PeerProvider).
 */
import { useState } from 'react';
import { usePeer, useToast, Icon, cn } from '@citadel-app/ui';

export const CollaborationBar = () => {
    const { status, peerId, connect } = usePeer();
    const [remoteId, setRemoteId] = useState('');
    const [isConnecting, setIsConnecting] = useState(false);
    const [showConnect, setShowConnect] = useState(false);
    const { toast } = useToast();

    const handleConnect = async () => {
        const targetId = remoteId.trim();
        if (!targetId) return;
        if (targetId === peerId) {
            toast('You cannot connect to yourself!', { type: 'warning' });
            return;
        }
        setIsConnecting(true);
        try {
            const success = await connect(remoteId.trim());
            if (success) {
                setShowConnect(false);
                setRemoteId('');
            } else {
                toast('Failed to connect to peer.', { type: 'error' });
            }
        } finally {
            setIsConnecting(false);
        }
    };

    return (
        <div className="absolute bottom-20 right-4 z-[10] flex flex-col items-end gap-1">
            {showConnect && (
                <div className="w-64 bg-background/95 backdrop-blur-md border border-border p-4 rounded-xl shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="space-y-4">
                        <div>
                            <label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground block mb-1">Your ID</label>
                            <div className="flex gap-1.5">
                                <input
                                    type="text"
                                    readOnly
                                    value={peerId || 'Not initialized'}
                                    className="flex-1 bg-muted/50 border border-border rounded px-2 py-1 text-[11px] font-mono outline-none"
                                />
                                <button
                                    onClick={() => {
                                        if (peerId) {
                                            navigator.clipboard.writeText(peerId);
                                        }
                                    }}
                                    className="p-1.5 bg-secondary text-secondary-foreground rounded hover:bg-secondary/80 transition-colors"
                                >
                                    <Icon name="Copy" size={12} />
                                </button>
                            </div>
                        </div>

                        <div className="border-t border-border pt-3">
                            <label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground block mb-1">Connect to Peer</label>
                            <div className="flex gap-1.5">
                                <input
                                    type="text"
                                    placeholder="Peer ID..."
                                    value={remoteId}
                                    onChange={(e) => setRemoteId(e.target.value)}
                                    className="flex-1 bg-muted/50 border border-border rounded px-2 py-1 text-[11px] font-mono outline-none focus:ring-1 focus:ring-primary/30"
                                />
                                <button
                                    onClick={handleConnect}
                                    disabled={isConnecting || !remoteId.trim()}
                                    className="px-2 py-1 bg-primary text-primary-foreground rounded text-[11px] font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
                                >
                                    {isConnecting ? '...' : <Icon name="Plus" size={12} />}
                                </button>
                            </div>
                        </div>

                        <div className="bg-primary/5 rounded-lg p-2 border border-primary/10">
                            <p className="text-[10px] text-muted-foreground flex items-start gap-1.5 leading-relaxed">
                                <Icon name="Info" size={10} className="mt-0.5 text-primary" />
                                <span>Real-time drawing sync is automatic once connected.</span>
                            </p>
                        </div>
                    </div>
                </div>
            )}

            <div
                onClick={() => setShowConnect(!showConnect)}
                className={cn(
                    "flex items-center gap-2 bg-background/80 backdrop-blur-md border border-border p-0.3 px-1 rounded-md shadow-lg",
                    "p-1.5 rounded-full hover:bg-muted transition-colors cursor-pointer",
                    showConnect && "bg-muted"
                )}
                title="Collaboration Settings"
            >
                <div className={cn(
                    "w-2.5 h-2.5 rounded-full ml-2",
                    status === 'connected' ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" :
                        status === 'loading' ? "bg-yellow-500 animate-pulse" :
                            "bg-red-500"
                )} title={`Status: ${status}`} />

                <span className="text-xs font-medium px-1 text-muted-foreground select-none">
                    {status === 'connected' ? 'Collab Active' : 'Offline'}
                </span>
            </div>
        </div>
    );
};
