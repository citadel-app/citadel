import React from 'react';
import { AppCommand } from '@citadel-app/core';
import { commandRegistry } from '../commands/CommandRegistry';
import { Icon, cn } from '@citadel-app/ui';

interface CommandProposalProps {
    commandId: string;
    args?: any[];
    status: 'pending' | 'approved' | 'rejected';
    onApprove: () => void;
    onReject: () => void;
}

export const CommandProposal: React.FC<CommandProposalProps> = ({
    commandId,
    args,
    status,
    onApprove,
    onReject
}) => {
    const command = commandRegistry.getCommand(commandId);

    if (!command) {
        return (
            <div className="p-4 border border-dashed border-border rounded-xl bg-muted/20 text-xs text-muted-foreground italic">
                Proposed action "{commandId}" is no longer available.
            </div>
        );
    }

    return (
        <div className={cn(
            "mt-3 border rounded-xl overflow-hidden transition-all duration-300",
            status === 'pending' ? "border-primary/30 bg-primary/5 shadow-sm" :
                status === 'approved' ? "border-green-500/30 bg-green-500/5 opacity-80" :
                    "border-border bg-muted/10 opacity-60"
        )}>
            <div className="px-4 py-3 flex items-start gap-3">
                <div className={cn(
                    "p-2 rounded-lg",
                    status === 'pending' ? "bg-primary/10 text-primary" :
                        status === 'approved' ? "bg-green-500/10 text-green-500" :
                            "bg-muted text-muted-foreground"
                )}>
                    <Icon name={command.icon || 'Zap'} size={18} />
                </div>
                <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold truncate">{command.name}</h4>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{command.description}</p>

                    {args && typeof args === 'object' && Object.keys(args).length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                            {Object.entries(args).map(([key, val]) => (
                                <span key={key} className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-mono">
                                    {key}: {String(val)}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {status === 'pending' && (
                <div className="px-4 py-2 bg-muted/30 border-t border-border/50 flex items-center justify-end gap-2">
                    <button
                        onClick={onReject}
                        className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-all"
                    >
                        Ignore
                    </button>
                    <button
                        onClick={onApprove}
                        className="px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg shadow-sm transition-all flex items-center gap-1.5"
                    >
                        <Icon name="Check" size={12} />
                        Proceed
                    </button>
                </div>
            )}

            {status === 'approved' && (
                <div className="px-4 py-1.5 bg-green-500/10 border-t border-green-500/10 flex items-center gap-1.5 text-[10px] font-bold text-green-600 uppercase tracking-widest">
                    <Icon name="Check" size={10} />
                    Executed
                </div>
            )}

            {status === 'rejected' && (
                <div className="px-4 py-1.5 bg-muted border-t border-border flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                    <Icon name="X" size={10} />
                    Ignored
                </div>
            )}
        </div>
    );
};
