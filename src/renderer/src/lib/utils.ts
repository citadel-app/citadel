import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

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
