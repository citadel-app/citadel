import React from 'react';
import { Icon } from '@citadel-app/ui';
import { cn } from '@citadel-app/ui';
import { useConfig } from '../../context/ConfigContext';

interface SectionContainerProps {
    title: string;
    entryType: string;
    children: React.ReactNode;
    isEditing?: boolean;
    onEdit?: () => void;
    onSave?: () => void;
    onCancel?: () => void;
    onDelete?: () => void;
    onAiAction?: () => void;
    className?: string;
    showActions?: boolean;
}

export const SectionContainer = ({
    title,
    entryType,
    children,
    isEditing = false,
    onEdit,
    onSave,
    onCancel,
    onDelete,
    onAiAction,
    className,
    showActions = true
}: SectionContainerProps) => {
    const { findSectionConfig } = useConfig();
    const config = findSectionConfig(entryType, title);
    const icon = config?.icon;

    return (
        <div className={cn(
            "rounded-lg border-l-4 transition-all border-border", // Default styling
            className
        )}>
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2">
                    {icon && <Icon name={icon} size={16} className="text-muted-foreground" />}
                    <h3 className="font-semibold text-sm">{title}</h3>
                </div>

                {showActions && (
                    <div className="flex items-center gap-1">
                        {isEditing ? (
                            <>
                                <button
                                    onClick={onSave}
                                    className="p-1.5 hover:bg-green-500/20 text-green-500 rounded transition-colors"
                                    title="Save"
                                >
                                    <Icon name="Check" size={14} />
                                </button>
                                <button
                                    onClick={onCancel}
                                    className="p-1.5 hover:bg-muted text-muted-foreground rounded transition-colors"
                                    title="Cancel"
                                >
                                    <Icon name="X" size={14} />
                                </button>
                            </>
                        ) : (
                            <>
                                {onAiAction && (
                                    <button
                                        onClick={onAiAction}
                                        className="p-1.5 hover:bg-purple-500/20 text-purple-600 rounded transition-colors"
                                        title="AI Action"
                                    >
                                        <Icon name="Sparkles" size={14} />
                                    </button>
                                )}
                                <button
                                    onClick={onEdit}
                                    className="p-1.5 hover:bg-muted text-muted-foreground rounded transition-colors"
                                    title="Edit"
                                >
                                    <Icon name="Pencil" size={14} />
                                </button>
                                {onDelete && (
                                    <button
                                        onClick={onDelete}
                                        className="p-1.5 hover:bg-red-500/20 text-muted-foreground hover:text-red-500 rounded transition-colors"
                                        title="Delete"
                                    >
                                        <Icon name="Trash2" size={14} />
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="px-4 pb-4">
                {children}
            </div>
        </div>
    );
};
