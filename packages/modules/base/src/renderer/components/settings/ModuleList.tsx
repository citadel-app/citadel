import { type ModuleDefinition } from '@citadel-app/core';
import { Box } from 'lucide-react';

interface ModuleListProps {
    modules: ModuleDefinition[];
}

export const ModuleList = ({ modules }: ModuleListProps) => {
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-muted-foreground">Active Plugin Modules</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {modules.map((module) => (
                    <div
                        key={module.id}
                        className="flex items-center justify-between p-3 border border-border rounded-lg bg-card hover:bg-accent/50 transition-colors h-full"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded bg-muted text-muted-foreground">
                                <Box size={20} />
                            </div>
                            <div>
                                <h3 className="font-medium text-sm">{module.label}</h3>
                                <p className="text-xs text-muted-foreground">{module.id} • {module.requirements?.length || 0} requirements</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
