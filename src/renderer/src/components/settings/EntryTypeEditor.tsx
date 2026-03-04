import React, { useState } from 'react';
import { EntryTypeConfig } from '../../config/entry-types';
import { FieldListEditor } from './editors/FieldListEditor';
import { MetadataListEditor } from './editors/MetadataListEditor';
import { SectionListEditor } from './editors/SectionListEditor';
import { ModuleMappingEditor } from './editors/ModuleMappingEditor';
import { SearchableIconPicker } from '../ui/SearchableIconPicker';
import { useConfig } from '../../context/ConfigContext';

interface EntryTypeEditorProps {
    initialEntry: EntryTypeConfig;
    onSave: (updated: EntryTypeConfig) => void;
    formId?: string;
}

export const EntryTypeEditor = ({ initialEntry, onSave, formId }: EntryTypeEditorProps) => {
    const [entry, setEntry] = useState<EntryTypeConfig>(initialEntry);
    const { config } = useConfig();
    const modulesRegistry = config.modules || {};

    const handleChange = (key: keyof EntryTypeConfig, value: any) => {
        setEntry(prev => ({ ...prev, [key]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(entry);
    };

    const getModuleId = (m: string | { id: string } | undefined) => {
        if (!m) return '';
        return typeof m === 'string' ? m : m.id;
    };

    const handleModuleChange = (position: 'primary' | 'secondary', newId: string) => {
        setEntry(prev => ({
            ...prev,
            view: {
                ...prev.view,
                modules: {
                    ...prev.view.modules,
                    [position]: newId === '' ? undefined : newId
                }
            }
        }));
    };

    const handleModuleConfigUpdate = (position: 'primary' | 'secondary', newConfig: any) => {
        setEntry(prev => ({
            ...prev,
            view: {
                ...prev.view,
                modules: {
                    ...prev.view.modules,
                    [position]: newConfig
                }
            }
        }));
    };

    const renderModuleConfig = (position: 'primary' | 'secondary') => {
        const modConfig = entry.view.modules[position];
        if (!modConfig) return null;

        const moduleId = getModuleId(modConfig);
        const moduleDef = modulesRegistry[moduleId];
        if (!moduleDef) return null;

        const normalizedConfig = typeof modConfig === 'string'
            ? { id: moduleId, map: {} }
            : modConfig;

        return (
            <ModuleMappingEditor
                moduleId={moduleId}
                config={normalizedConfig}
                moduleDef={moduleDef}
                availableFields={[...entry.fields, ...entry.metadata]}
                onChange={(newConf) => handleModuleConfigUpdate(position, newConf)}
            />
        );
    };

    return (
        <form id={formId} onSubmit={handleSubmit} className="space-y-6 pb-20">
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Label</label>
                    <input
                        type="text"
                        value={entry.label}
                        onChange={(e) => handleChange('label', e.target.value)}
                        className="w-full h-8 px-2 text-sm bg-background border border-input rounded focus:border-primary outline-none"
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Folder</label>
                    <input
                        type="text"
                        value={entry.folder}
                        onChange={(e) => handleChange('folder', e.target.value)}
                        className="w-full h-8 px-2 text-sm bg-background border border-input rounded focus:border-primary outline-none"
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Icon</label>
                    <SearchableIconPicker
                        value={entry.icon}
                        onChange={(val) => handleChange('icon', val)}
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Type Key (Read-only)</label>
                    <input
                        type="text"
                        value={entry.type}
                        readOnly
                        className="w-full h-8 px-2 text-sm bg-muted/50 border border-input rounded text-muted-foreground cursor-not-allowed outline-none"
                    />
                </div>
            </div>

            <div className="flex flex-col gap-3 p-3 bg-muted/30 border border-border rounded-lg">
                <div className="flex items-center gap-3">
                    <input
                        type="checkbox"
                        id="excludeIndexing"
                        checked={entry.excludeFromBackgroundIndexing || false}
                        onChange={(e) => handleChange('excludeFromBackgroundIndexing', e.target.checked)}
                        className="rounded border-input text-primary focus:ring-primary h-4 w-4"
                    />
                    <div>
                        <label htmlFor="excludeIndexing" className="text-sm font-medium block">Block Background Indexing</label>
                        <p className="text-[10px] text-muted-foreground">If enabled, entries of this type will only be indexed manually or on-demand.</p>
                    </div>
                </div>

                <div className="flex items-center gap-3 pt-3 border-t border-border/50">
                    <input
                        type="checkbox"
                        id="aiFeaturesEnabled"
                        checked={entry.aiFeaturesEnabled !== false} // Default to true if undefined
                        onChange={(e) => handleChange('aiFeaturesEnabled', e.target.checked)}
                        className="rounded border-input text-primary focus:ring-primary h-4 w-4"
                    />
                    <div>
                        <label htmlFor="aiFeaturesEnabled" className="text-sm font-medium block">Enable AI Features</label>
                        <p className="text-[10px] text-muted-foreground">Enable smart actions like summarization, tag suggestions, and grammar fixing.</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Accent Color Class</label>
                    <input
                        type="text"
                        value={entry.accentColor}
                        onChange={(e) => handleChange('accentColor', e.target.value)}
                        placeholder="text-blue-500"
                        className="w-full h-8 px-2 text-sm bg-background border border-input rounded focus:border-primary outline-none"
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Accent Bg Class</label>
                    <input
                        type="text"
                        value={entry.accentBg}
                        onChange={(e) => handleChange('accentBg', e.target.value)}
                        placeholder="bg-blue-500/10"
                        className="w-full h-8 px-2 text-sm bg-background border border-input rounded focus:border-primary outline-none"
                    />
                </div>
            </div>

            <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Description</label>
                <textarea
                    value={entry.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    className="w-full h-20 px-2 py-2 text-sm bg-background border border-input rounded focus:border-primary outline-none resize-none"
                />
            </div>

            <div className="border-t border-border pt-4 mt-2">
                <h4 className="text-xs font-bold uppercase text-muted-foreground mb-3">View Configuration</h4>
                <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Layout</label>
                        <select
                            value={entry.view.layout}
                            onChange={(e) => handleChange('view', { ...entry.view, layout: e.target.value })}
                            className="w-full h-8 px-2 text-sm bg-background border border-input rounded focus:border-primary outline-none"
                        >
                            <option value="single">Single Panel</option>
                            <option value="split">Split View</option>
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Primary Module</label>
                        <select
                            value={getModuleId(entry.view.modules.primary)}
                            onChange={(e) => handleModuleChange('primary', e.target.value)}
                            className="w-full h-8 px-2 text-sm bg-background border border-input rounded focus:border-primary outline-none text-popover-foreground"
                        >
                            <option value="">None</option>
                            {Object.values(modulesRegistry).map(m => (
                                <option key={m.id} value={m.id} className="bg-popover text-foreground">{m.label}</option>
                            ))}
                        </select>
                        {renderModuleConfig('primary')}
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Secondary Module</label>
                        <select
                            value={getModuleId(entry.view.modules.secondary)}
                            onChange={(e) => handleModuleChange('secondary', e.target.value)}
                            className="w-full h-8 px-2 text-sm bg-background border border-input rounded focus:border-primary outline-none text-popover-foreground"
                        >
                            <option value="">None</option>
                            {Object.values(modulesRegistry).map(m => (
                                <option key={m.id} value={m.id} className="bg-popover text-foreground">{m.label}</option>
                            ))}
                        </select>
                        {renderModuleConfig('secondary')}
                    </div>
                </div>
            </div>

            <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Serializer Key (Optional)</label>
                <input
                    type="text"
                    value={entry.serializerKey || ''}
                    onChange={(e) => handleChange('serializerKey', e.target.value)}
                    placeholder="markdown"
                    className="w-full h-8 px-2 text-sm bg-background border border-input rounded focus:border-primary outline-none"
                />
            </div>

            <div className="border-t border-border pt-4 mt-2 space-y-6">
                <h4 className="text-xs font-bold uppercase text-muted-foreground">Structure Configuration</h4>

                <FieldListEditor
                    fields={entry.fields}
                    onChange={(val) => handleChange('fields', val)}
                />

                <MetadataListEditor
                    metadata={entry.metadata}
                    onChange={(val) => handleChange('metadata', val)}
                />

                <SectionListEditor
                    sections={entry.sections}
                    onChange={(val) => handleChange('sections', val)}
                />
            </div>
        </form>
    );
};
