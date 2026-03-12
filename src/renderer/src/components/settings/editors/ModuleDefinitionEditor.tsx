import React, { useState } from 'react';
import { type ModuleDefinition } from '@shared';
import { RequirementListEditor } from './RequirementListEditor';

interface ModuleDefinitionEditorProps {
    moduleId: string;
    initialModule: ModuleDefinition;
    onSave: (updated: ModuleDefinition) => void;
    formId?: string;
}

export const ModuleDefinitionEditor = ({ moduleId, initialModule, onSave, formId }: ModuleDefinitionEditorProps) => {
    const [module, setModule] = useState<ModuleDefinition>(initialModule);

    const handleChange = (key: keyof ModuleDefinition, value: any) => {
        setModule(prev => ({ ...prev, [key]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(module);
    };

    return (
        <form id={formId} onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">ID (Read-only)</label>
                    <input
                        type="text"
                        value={moduleId}
                        readOnly
                        className="w-full h-8 px-2 text-sm bg-muted/50 border border-input rounded text-muted-foreground cursor-not-allowed outline-none"
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Label</label>
                    <input
                        type="text"
                        value={module.label}
                        onChange={(e) => handleChange('label', e.target.value)}
                        className="w-full h-8 px-2 text-sm bg-background border border-input rounded focus:border-primary outline-none"
                    />
                </div>
            </div>

            <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Description</label>
                <textarea
                    value={module.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    className="w-full h-20 px-2 py-2 text-sm bg-background border border-input rounded focus:border-primary outline-none resize-none"
                />
            </div>

            <div className="border-t border-border pt-4 mt-2">
                <RequirementListEditor
                    requirements={module.requirements}
                    onChange={(val) => handleChange('requirements', val)}
                />
            </div>
        </form>
    );
};
