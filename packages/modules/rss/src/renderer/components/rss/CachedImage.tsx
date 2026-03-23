import { cn, Icon } from '@citadel-app/ui';
import React, { useState, useEffect } from 'react';

interface CachedImageProps {
    src: string;
    alt?: string;
    className?: string;
    fallbackIcon?: string;
    onLoad?: () => void;
}

export const CachedImage: React.FC<CachedImageProps> = ({ src, alt, className, fallbackIcon = 'Rss', onLoad }) => {
    const [cachedSrc, setCachedSrc] = useState<string | null>(null);
    const [error, setError] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;
        setLoading(true);
        setError(false);

        const loadImage = async () => {
            if (!src) return;

            try {
                // Check if we have a cached version (simplified for now: just browser cache + retry logic)
                // In a full implementation, we'd use dataManager to save to disk.
                // For now, we'll use an Image object to pre-fetch and handle errors silenty.
                const img = new Image();
                img.src = src;
                img.onload = () => {
                    if (isMounted) {
                        setCachedSrc(src);
                        setLoading(false);
                        onLoad?.();
                    }
                };
                img.onerror = () => {
                    if (isMounted) {
                        setError(true);
                        setLoading(false);
                    }
                };
            } catch (e) {
                if (isMounted) {
                    setError(true);
                    setLoading(false);
                }
            }
        };

        loadImage();
        return () => { isMounted = false; };
    }, [src]);

    if (error || !src) {
        return (
            <div className={cn("flex items-center justify-center bg-muted/20 rounded-sm", className)}>
                <Icon name={fallbackIcon as any} size={14} className="text-muted-foreground/40" />
            </div>
        );
    }

    if (loading && !cachedSrc) {
        return <div className={cn("animate-pulse bg-muted/20 rounded-sm", className)} />;
    }

    return (
        <img
            src={cachedSrc || src}
            alt={alt}
            className={className}
            loading="lazy"
        />
    );
};
