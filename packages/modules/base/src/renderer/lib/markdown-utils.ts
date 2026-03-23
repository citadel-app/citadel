export const transformMarkdownUrl = (uri: string, filePath?: string) => {
    if (!uri) return uri;
    if (uri.startsWith('http') || uri.startsWith('codex://') || uri.startsWith('data:')) {
        return uri;
    }

    // 1. Handle pre-existing Windows absolute paths
    const isWindowsPath = /^[a-zA-Z]:[\\/]/.test(uri);
    if (isWindowsPath) {
        return `codex:///${uri.replace(/\\/g, '/')}`;
    }

    // 2. Handle relative paths and local file paths
    if (filePath && (uri.startsWith('./') || uri.startsWith('../') || !uri.startsWith('/'))) {
        try {
            // Normalize filePath to use forward slashes for cross-platform consistency
            const normalizedFilePath = filePath.replace(/\\/g, '/');
            const lastSlashIndex = normalizedFilePath.lastIndexOf('/');

            // Get the directory of the markdown file
            const dirPath = lastSlashIndex !== -1 ? normalizedFilePath.substring(0, lastSlashIndex) : '';

            // Remove leading ./ for cleaner path construction
            let cleanUri = uri.replace(/^(\.\/)/, '');

            // Use triple slash for codex:/// to ensure everything after is treated as path by the app protocol
            const finalPath = dirPath ? `${dirPath}/${cleanUri}` : cleanUri;
            return `codex:///${finalPath}`;
        } catch (e) {
            console.error('[MarkdownUtils] Error resolving image path:', e);
            return uri;
        }
    }
    return uri;
};
