import React, { useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { Command } from 'cmdk';
import { Icon } from '../IconRegistry';
import { POPULAR_MODELS, ollamaClient, type AIModel } from '../../ai';

interface ModelSelectProps {
    value: string;
    onChange: (value: string) => void;
    availableModels: AIModel[];
    className?: string;
    placeholder?: string;
}

export const ModelSelect: React.FC<ModelSelectProps> = ({ value, onChange, availableModels, className, placeholder }) => {
    const [open, setOpen] = useState(false);
    const [specs, setSpecs] = useState<{ totalMemory: number, gpus: { model: string, vram: number }[] } | null>(null);

    React.useEffect(() => {
        ollamaClient.getHardwareSpecs().then(setSpecs);
    }, []);

    // Filter popular models to exclude those already installed
    // normalize names for comparison
    const suggestions = POPULAR_MODELS.filter(m => !availableModels.some(installed => installed.name.split(':')[0] === m.name.split(':')[0] || installed.name === m.name));

    // Sort installed models
    const installed = [...availableModels].sort((a, b) => a.name.localeCompare(b.name));

    const formatSize = (bytes?: number) => {
        if (!bytes) return '';
        const gb = bytes / (1024 * 1024 * 1024);
        if (gb >= 1) return `${gb.toFixed(1)}GB`;
        const mb = bytes / (1024 * 1024);
        return `${mb.toFixed(0)}MB`;
    };

    const getScoreColor = (score: string) => {
        switch (score) {
            case 'excellent': return 'bg-green-500/10 text-green-500';
            case 'good': return 'bg-yellow-500/10 text-yellow-500';
            case 'poor': return 'bg-red-500/10 text-red-500';
            default: return 'bg-muted text-muted-foreground';
        }
    };

    return (
        <Popover.Root open={open} onOpenChange={setOpen}>
            <Popover.Trigger asChild>
                <button
                    role="combobox"
                    aria-expanded={open}
                    className={`inline-flex items-center justify-between rounded px-3 py-2 text-sm gap-2 bg-muted border border-border focus:ring-1 focus:ring-primary outline-none data-[placeholder]:text-muted-foreground text-left ${className}`}
                >
                    <span className="truncate">
                        {value || placeholder || "Select a model..."}
                    </span>
                    <Icon name="ChevronDown" size={14} className="opacity-50 shrink-0" />
                </button>
            </Popover.Trigger>

            <Popover.Portal>
                <Popover.Content
                    className="w-[var(--radix-popover-trigger-width)] min-w-[300px] p-0 overflow-hidden bg-popover text-popover-foreground rounded-md border border-border shadow-lg z-[100]"
                    align="start"
                    sideOffset={5}
                >
                    <Command className="flex flex-col w-full h-full overflow-hidden bg-popover text-popover-foreground">
                        <div className="flex items-center border-b border-border px-3">
                            <Icon name="Search" size={14} className="mr-2 opacity-50" />
                            <Command.Input
                                placeholder="Search models..."
                                className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                            />
                        </div>
                        <Command.List className="max-h-[300px] overflow-y-auto overflow-x-hidden p-1">
                            <Command.Empty className="py-6 text-center text-sm">No model found.</Command.Empty>

                            {installed.length > 0 && (
                                <Command.Group heading="Installed" className="px-2 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                    {installed.map((model) => (
                                        <Command.Item
                                            key={model.name}
                                            value={model.name}
                                            onSelect={(currentValue) => {
                                                onChange(currentValue);
                                                setOpen(false);
                                            }}
                                            className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none aria-selected:bg-accent aria-selected:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                                        >
                                            <Icon name="Check" size={14} className={`mr-2 h-4 w-4 shrink-0 ${value === model.name ? "opacity-100" : "opacity-0"}`} />
                                            <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium truncate">{model.name}</span>
                                                    {model.details?.parameter_size && (
                                                        <span className="text-[10px] bg-secondary text-secondary-foreground px-1 rounded whitespace-nowrap">{model.details.parameter_size}</span>
                                                    )}
                                                </div>
                                                {model.size && (
                                                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                                                        <span>{formatSize(model.size)}</span>
                                                        {model.details?.quantization_level && (
                                                            <>
                                                                <span>•</span>
                                                                <span>{model.details.quantization_level}</span>
                                                            </>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </Command.Item>
                                    ))}
                                </Command.Group>
                            )}

                            {installed.length > 0 && suggestions.length > 0 && <Command.Separator className="-mx-1 h-px bg-border text-red-500 my-1" />}

                            {suggestions.length > 0 && (
                                <Command.Group heading="Popular (Download)" className="px-2 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                    {suggestions.map((model) => {
                                        const score = specs ? ollamaClient.scoreModel(model, specs) : null;
                                        return (
                                            <Command.Item
                                                key={model.name}
                                                value={model.name}
                                                onSelect={() => {
                                                    onChange(model.name);
                                                    setOpen(false);
                                                }}
                                                className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none aria-selected:bg-accent aria-selected:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                                            >
                                                <div className="mr-2 flex items-center justify-center w-4 h-4 shrink-0">
                                                    <Icon name="Download" size={14} className={`opacity-50 ${value === model.name ? "hidden" : ""}`} />
                                                    <Icon name="Check" size={14} className={`${value === model.name ? "opacity-100" : "opacity-0 hidden"}`} />
                                                </div>

                                                <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-medium truncate">{model.displayName}</span>
                                                        <span className="text-[10px] bg-primary/10 text-primary px-1 rounded whitespace-nowrap">{model.parameters}</span>
                                                        {score && (
                                                            <span className={`text-[10px] px-1 rounded whitespace-nowrap ml-auto cursor-help pointer-events-auto ${getScoreColor(score.score)}`} title={score.reason}>
                                                                {score.score === 'excellent' ? 'Great Fit' : score.score === 'good' ? 'Good' : 'Heavy'}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                                                        <span className="truncate">{model.name}</span>
                                                        <span>•</span>
                                                        <span>{model.size}</span>
                                                    </div>
                                                </div>
                                            </Command.Item>
                                        )
                                    })}
                                </Command.Group>
                            )}
                        </Command.List>
                    </Command>
                </Popover.Content>
            </Popover.Portal>
        </Popover.Root>
    );
};
