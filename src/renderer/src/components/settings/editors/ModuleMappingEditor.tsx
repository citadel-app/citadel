import React from 'react';
import { ModuleConfig, ModuleDefinition, EntryFieldConfig, EntryMetadataConfig } from '../../../config/entry-types';
import { cn } from '../../../lib/utils';
import { ArrowRight, AlertTriangle } from 'lucide-react';

interface ModuleMappingEditorProps {
    moduleId: string;
    config: ModuleConfig; // Normalized config object (id + map)
    moduleDef: ModuleDefinition;
    availableFields: (EntryFieldConfig | EntryMetadataConfig)[];
    onChange: (newConfig: ModuleConfig) => void;
}

export const ModuleMappingEditor = ({
    moduleId,
    config,
    moduleDef,
    availableFields,
    onChange
}: ModuleMappingEditorProps) => {

    if (!moduleDef.requirements || moduleDef.requirements.length === 0) {
        return (
            <div className="text-xs text-muted-foreground italic px-2">
                No configuration needed for this module.
            </div>
        );
    }

    const handleMapChange = (reqKey: string, fieldKey: string) => {
        const newMap = { ...config.map };
        if (fieldKey === '') {
            delete newMap[reqKey];
        } else {
            newMap[reqKey] = fieldKey;
        }
        onChange({ ...config, map: newMap });
    };

    return (
        <div className="space-y-3 mt-2 border-l-2 border-border pl-3 ml-1">
            <div className="text-xs font-semibold text-muted-foreground mb-2">
                Data Mapping
            </div>

            {moduleDef.requirements.map(req => {
                const currentMap = config.map?.[req.key];

                // Determine status for UI feedback
                let status: 'mapped' | 'auto' | 'missing' = 'missing';
                let effectiveFieldKey = currentMap;

                if (effectiveFieldKey) {
                    // Explicitly mapped
                    // Check if field still exists
                    if (availableFields.some(f => f.key === effectiveFieldKey)) {
                        status = 'mapped';
                    } else {
                        status = 'missing'; // Mapped to non-existent field
                    }
                } else {
                    // Auto-detection attempt (similar to validation logic)
                    if (availableFields.some(f => f.key === req.key)) {
                        effectiveFieldKey = req.key;
                        status = 'auto';
                    } else {
                        // Check legacy fallbacks
                        if (moduleId === 'pdf' && req.key === 'source') {
                            if (availableFields.some(f => f.key === 'pdfPath')) { effectiveFieldKey = 'pdfPath'; status = 'auto'; }
                            else if (availableFields.some(f => f.key === 'sourceUrl')) { effectiveFieldKey = 'sourceUrl'; status = 'auto'; }
                        } else if (moduleId === 'webview' && req.key === 'url') {
                            if (availableFields.some(f => f.key === 'sourceUrl')) { effectiveFieldKey = 'sourceUrl'; status = 'auto'; }
                        }
                    }
                }

                return (
                    <div key={req.key} className="space-y-1">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-medium flex items-center gap-1" title={req.description}>
                                {req.label}
                                <span className="text-[10px] text-muted-foreground/70 font-mono">({req.key})</span>
                            </label>
                            {status === 'auto' && (
                                <span className="text-[10px] bg-blue-500/10 text-blue-500 px-1 rounded">Auto-detected</span>
                            )}
                            {status === 'missing' && (
                                <span className="text-[10px] bg-yellow-500/10 text-yellow-500 px-1 rounded flex items-center gap-0.5">
                                    <AlertTriangle size={10} /> Missing
                                </span>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            <ArrowRight size={12} className="text-muted-foreground shrink-0" />
                            <select
                                value={currentMap || ''}
                                onChange={(e) => handleMapChange(req.key, e.target.value)}
                                className={cn(
                                    "w-full h-7 px-2 text-xs border rounded outline-none",
                                    status === 'missing' ? "border-yellow-500/50 bg-yellow-500/5 text-yellow-500" : "bg-background border-input text-foreground"
                                )}
                            >
                                <option value="">
                                    {status === 'auto' ? `(Default: ${effectiveFieldKey})` : '(Select a field...)'}
                                </option>
                                <optgroup label="Fields">
                                    {availableFields.filter(f => 'required' in f).map(f => (
                                        <option key={f.key} value={f.key}>{f.label} ({f.key})</option>
                                    ))}
                                </optgroup>
                                <optgroup label="Metadata">
                                    {availableFields.filter(f => !('required' in f)).map(f => (
                                        <option key={f.key} value={f.key}>{f.label} ({f.key})</option>
                                    ))}
                                </optgroup>
                            </select>
                        </div>
                        {req.description && <p className="text-[10px] text-muted-foreground ml-5">{req.description}</p>}
                    </div>
                );
            })}
        </div>
    );
};
