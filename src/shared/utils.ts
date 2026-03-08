export function slugify(text: string): string {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '_')     // Replace spaces with -
        .replace(/[^\w\-]+/g, '') // Remove all non-word chars
        .replace(/\-\-+/g, '_');  // Replace multiple - with single -
}

export function humanizeFilename(title: string): string {
    // Keep it readable but safe for FS
    // e.g. "My Cool Note!" -> "My_Cool_Note"
    let safe = title.trim().replace(/[\\/:*?"<>|]/g, ''); // Remove invalid filename chars
    safe = safe.replace(/\s+/g, '_'); // Replace spaces with underscores
    return safe;
}

export function resolveResourceUrl(filePath: string, resourcePath: string): string {
    if (!resourcePath) return '';
    if (resourcePath.startsWith('data:')) return resourcePath;
    if (resourcePath.startsWith('http')) return resourcePath;
    
    // Normalize slashes to forward
    const normalizedFile = filePath.replace(/\\/g, '/');
    
    // Check if filePath is absolute
    const isWindowsAbsolute = /^[a-zA-Z]:/.test(normalizedFile);
    const isPosixAbsolute = normalizedFile.startsWith('/');
    
    let parentDir = '';
    if (isWindowsAbsolute || isPosixAbsolute) {
        parentDir = normalizedFile.substring(0, normalizedFile.lastIndexOf('/'));
    } else {
        // Fallback: If filePath is relative, we can't easily resolve it here
        // We'll trust the protocol handler in Main to anchor it to vault root
        console.warn(`[resolveResourceUrl] filePath is relative: ${filePath}. Resource: ${resourcePath}`);
    }
    
    let absolutePath = '';
    
    if (resourcePath.startsWith('./')) {
        const sub = resourcePath.substring(2);
        absolutePath = parentDir ? `${parentDir}/${sub}` : sub;
    } else if (resourcePath.startsWith('../')) {
        // Simple one-level up support
        if (parentDir) {
            const grandParent = parentDir.substring(0, parentDir.lastIndexOf('/'));
            absolutePath = `${grandParent}/${resourcePath.substring(3)}`;
        } else {
            absolutePath = resourcePath;
        }
    } else if (!resourcePath.includes(':') && !resourcePath.startsWith('/') && !resourcePath.startsWith('codex:')) {
        // Relative but no prefix
        absolutePath = parentDir ? `${parentDir}/${resourcePath}` : resourcePath;
    } else {
        // Already looks absolute or has protocol
        absolutePath = resourcePath;
    }
    
    // Ensure forward slashes for the protocol URL
    const protocolPath = absolutePath.replace(/\\/g, '/').replace(/^codex:\/\//, '');
    
    return `codex://${protocolPath}`;
}

/**
 * Concurrency-limited async map helper
 */
export async function pMap<T, R>(
    items: T[],
    mapper: (item: T) => Promise<R>,
    concurrency: number
): Promise<R[]> {
    const results: R[] = new Array(items.length);
    const iterator = items.entries();

    const workers = Array(Math.min(items.length, concurrency)).fill(null).map(async () => {
        for (const [index, item] of iterator) {
            try {
                results[index] = await mapper(item);
            } catch (e) {
                console.error(`Error processing item ${index}`, e);
                throw e;
            }
        }
    });

    await Promise.all(workers);
    return results;
}

/**
 * Light sanitization for TTS — replace ligatures with ASCII equivalents,
 * strip only truly non-speakable symbols (math, geometric, arrows).
 */
export function sanitizeForTts(text: string): string {
    return text
        // Replace common PDF ligatures with ASCII
        .replace(/\uFB00/g, 'ff')
        .replace(/\uFB01/g, 'fi')
        .replace(/\uFB02/g, 'fl')
        .replace(/\uFB03/g, 'ffi')
        .replace(/\uFB04/g, 'ffl')
        .replace(/\uFB05/g, 'st')
        .replace(/\uFB06/g, 'st')
        // Strip non-speakable symbol ranges
        .replace(/[\u2200-\u22FF]/g, '')   // Mathematical Operators
        .replace(/[\u25A0-\u25FF]/g, '')   // Geometric Shapes
        .replace(/[\u2500-\u259F]/g, '')   // Box Drawing + Block Elements
        .replace(/[\u2190-\u21FF]/g, '')   // Arrows
        .replace(/[\u2700-\u27BF]/g, '')   // Dingbats
        .replace(/[\u2300-\u23FF]/g, '')   // Misc Technical
        .replace(/[\u27C0-\u27EF\u2980-\u29FF\u2A00-\u2AFF]/g, '') // Misc Math
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Recursively removes undefined values from an object or array.
 * Useful for normalizing frontmatter before serialization.
 */
export function sanitizeMetadata(obj: any): any {
    if (obj === null || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(v => sanitizeMetadata(v));

    const result: any = {};
    Object.entries(obj).forEach(([key, value]) => {
        if (value !== undefined) {
            result[key] = sanitizeMetadata(value);
        }
    });
    return result;
}
