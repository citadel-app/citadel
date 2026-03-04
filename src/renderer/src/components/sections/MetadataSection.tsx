import { Icon } from '../IconRegistry';
import { cn } from '../../lib/utils';
import { useConfig } from '../../context/ConfigContext';

interface MetadataSectionProps {
    entryType: string;
    tags: string[];
    sourceUrl?: string;
    source?: string;
    sourceId?: string;
    difficulty?: string;
    rfcNumber?: string;
    className?: string;
}

// Humanize a string: easy -> Easy, key_concepts -> Key Concepts
const humanize = (str: string): string => {
    return str
        .replace(/_/g, ' ')
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
};

// Get difficulty color
const getDifficultyColor = (difficulty: string): string => {
    switch (difficulty.toLowerCase()) {
        case 'easy': return 'bg-green-500/10 text-green-500 border-green-500/30';
        case 'medium': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30';
        case 'hard': return 'bg-red-500/10 text-red-500 border-red-500/30';
        default: return 'bg-muted text-muted-foreground';
    }
};

export const MetadataSection = ({
    entryType,
    tags,
    sourceUrl,
    source,
    sourceId,
    difficulty,
    rfcNumber,
    className
}: MetadataSectionProps) => {
    const { getEntryTypeConfig } = useConfig();
    const typeConfig = getEntryTypeConfig(entryType);

    return (
        <div className={cn("flex flex-wrap items-center gap-2", className)}>
            {/* Entry Type Badge */}
            {typeConfig && (
                <span className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border",
                    typeConfig.accentBg + '/10',
                    typeConfig.accentColor,
                    'border-current/30'
                )}>
                    <Icon name={typeConfig.icon} size={12} />
                    {humanize(entryType)}
                </span>
            )}

            {/* Difficulty Badge */}
            {difficulty && (
                <span className={cn(
                    "px-2.5 py-1 rounded-full text-xs font-medium border",
                    getDifficultyColor(difficulty)
                )}>
                    {humanize(difficulty)}
                </span>
            )}

            {/* Source Badge */}
            {source && (
                <span className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-500/10 text-blue-500 border border-blue-500/30 rounded-full text-xs font-medium">
                    <Icon name="Globe" size={12} />
                    {humanize(source)}
                    {sourceId && <span className="text-blue-400">#{sourceId}</span>}
                </span>
            )}

            {/* RFC Number */}
            {rfcNumber && (
                <span className="flex items-center gap-1.5 px-2.5 py-1 bg-cyan-500/10 text-cyan-500 border border-cyan-500/30 rounded-full text-xs font-medium">
                    <Icon name="FileCode" size={12} />
                    RFC {rfcNumber}
                </span>
            )}

            {/* Tags */}
            {tags.map(tag => (
                <span
                    key={tag}
                    className="px-2.5 py-1 bg-muted text-muted-foreground rounded-full text-xs"
                >
                    {humanize(tag)}
                </span>
            ))}

            {/* Source URL Link */}
            {sourceUrl && (
                <a
                    href={sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 px-2.5 py-1 text-xs text-primary hover:underline"
                >
                    <Icon name="ExternalLink" size={12} />
                    Source
                </a>
            )}
        </div>
    );
};

export { humanize };
