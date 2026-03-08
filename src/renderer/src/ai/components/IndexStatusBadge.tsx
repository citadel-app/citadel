import { useState, useEffect, useCallback } from 'react';
import { Icon } from '../../components/IconRegistry';
import { useAppSettings } from '../../context/AppSettingsContext';
import type { CodexEntry } from '../../lib/db';

interface IndexStatusBadgeProps {
    entry: CodexEntry;
    onIndexComplete?: () => void;
}

export const IndexStatusBadge = ({ entry, onIndexComplete }: IndexStatusBadgeProps) => {
    const { settings } = useAppSettings();
    const [status, setStatus] = useState<'checking' | 'not-indexed' | 'indexed' | 'indexing' | 'unavailable'>('checking');
    const [chunkCount, setChunkCount] = useState(0);
    const [lastIndexed, setLastIndexed] = useState<Date | null>(null);

    const checkStatus = useCallback(async () => {
        setStatus('checking');

        // First check if RAG is available
        const { available } = await window.api.ai.isAvailable();
        if (!available) {
            setStatus('unavailable');
            return;
        }

        // Check index status
        const indexStatus = await window.api.db.getAIIndexStatus(entry.id);
        if (indexStatus) {
            setStatus('indexed');
            setChunkCount(indexStatus.chunkCount);
            setLastIndexed(indexStatus.lastIndexed);
        } else {
            setStatus('not-indexed');
        }
    }, [entry.id]);

    useEffect(() => {
        checkStatus();
    }, [checkStatus]);

    const handleIndex = async () => {
        setStatus('indexing');
        const result = await window.api.ai.indexEntry(entry, {
            chunkSize: settings.ai?.rag?.chunkSize ?? 1000,
            chunkOverlap: settings.ai?.rag?.chunkOverlap ?? 100,
            indexPdf: settings.ai?.rag?.indexPdf ?? true,
            indexUrl: settings.ai?.rag?.indexUrl ?? true,
            indexMarkdown: settings.ai?.rag?.indexMarkdown ?? true
        });
        if (result.success) {
            setChunkCount(result.chunkCount);
            setLastIndexed(new Date());
            setStatus('indexed');
            onIndexComplete?.();
        } else {
            setStatus('not-indexed');
        }
    };

    if (status === 'unavailable') {
        return null; // Don't show badge if RAG isn't available
    }

    if (status === 'checking') {
        return (
            <div className="flex items-center gap-1 text-xs text-muted-foreground px-2 py-1 bg-muted/50 rounded-md">
                <Icon name="Loader2" size={12} className="animate-spin" />
            </div>
        );
    }

    if (status === 'indexing') {
        return (
            <div className="flex items-center gap-1 text-xs text-purple-500 px-2 py-1 bg-purple-500/10 rounded-md">
                <Icon name="Database" size={12} className="animate-pulse" />
                <span>Indexing...</span>
            </div>
        );
    }

    if (status === 'indexed') {
        const timeAgo = lastIndexed ? formatTimeAgo(lastIndexed) : '';
        return (
            <div className="flex items-center gap-1">
                <div
                    className="flex items-center gap-1 text-xs text-green-600 px-2 py-1 bg-green-500/10 rounded-l-md cursor-help"
                    title={`Indexed ${chunkCount} chunks${timeAgo ? ` • ${timeAgo}` : ''}`}
                >
                    <Icon name="Check" size={12} />
                    <span>{chunkCount} chunks</span>
                </div>
                <button
                    onClick={handleIndex}
                    className="flex items-center px-1.5 py-1 text-xs text-green-600 hover:text-green-500 bg-green-500/10 hover:bg-green-500/20 rounded-r-md transition-colors border-l border-green-500/20"
                    title="Re-index entry"
                >
                    <Icon name="RefreshCw" size={12} />
                </button>
            </div>
        );
    }

    // not-indexed
    return (
        <button
            onClick={handleIndex}
            className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-500 px-2 py-1 bg-amber-500/10 hover:bg-amber-500/20 rounded-md transition-colors"
            title="Click to index this entry for semantic search"
        >
            <Icon name="Database" size={12} />
            <span>Index</span>
        </button>
    );
};

function formatTimeAgo(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
}
