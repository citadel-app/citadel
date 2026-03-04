import { Icon } from '../IconRegistry';
import { useConfig } from '../../context/ConfigContext';
// import { SectionConfig } from '../../config/entry-sections'; // Deprecated
import { cn } from '../../lib/utils';

interface GhostSectionsProps {
    entryType: string;
    existingSectionTitles: string[];
    onAddSection: (title: string) => void;
    onAiGenerate: (section: any) => void;
    className?: string;
    aiEnabled?: boolean;
}

export const GhostSections = ({
    entryType,
    existingSectionTitles,
    onAddSection,
    onAiGenerate,
    className,
    aiEnabled = true
}: GhostSectionsProps) => {
    const { getEntryTypeConfig } = useConfig();
    const config = getEntryTypeConfig(entryType);
    if (!config) return null;
    const sectionConfigs = config.sections || [];

    const missingSections = sectionConfigs.filter(
        c => !existingSectionTitles.some(
            title => title.toLowerCase() === c.title.toLowerCase()
        )
    );

    if (missingSections.length === 0) return null;

    return (
        <div
            className={cn("grid gap-3", className)}
            style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}
        >
            {missingSections.map((sectionConfig) => (
                <div key={sectionConfig.title} className="relative group/ghost">
                    <button
                        onClick={() => onAddSection(sectionConfig.title)}
                        className={cn(
                            "w-full flex items-center gap-3 p-2 rounded-lg border-2 border-dashed",
                            "transition-all group text-left h-full",
                            "border-border opacity-60 hover:opacity-100 hover:scale-[1.01] hover:bg-muted/50"
                        )}
                    >
                        <div className={cn(
                            "p-2 rounded-full shadow-sm text-muted-foreground group-hover:text-purple-500 group-hover:border-purple-200 transition-colors"
                        )}>
                            <Icon name={sectionConfig.icon || 'Plus'} size={18} />
                        </div>
                        <div>
                            <div className="font-semibold text-foreground">{sectionConfig.title}</div>
                            <div className="text-xs text-muted-foreground">Click to add</div>
                        </div>
                    </button>

                    {aiEnabled && sectionConfig.description && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onAiGenerate(sectionConfig);
                            }}
                            title="Generate with AI"
                            className={cn(
                                "absolute top-2 right-2 p-1.5 rounded-md",
                                "bg-purple-500/10 text-purple-600 hover:bg-purple-500 hover:text-white",
                                "opacity-0 group-hover/ghost:opacity-100 transition-all shadow-sm",
                                "flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider pl-2"
                            )}
                        >
                            <Icon name="Sparkles" size={14} />
                            Generate
                        </button>
                    )}
                </div>
            ))}
        </div>
    );
};
