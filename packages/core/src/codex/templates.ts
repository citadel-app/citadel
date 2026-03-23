import { type WorkspaceConfig } from './entry-types';

/**
 * Generates the default README.md content for a new workspace.
 */
export function generateDefaultReadme(rootPath: string, config: WorkspaceConfig): string {
    const workspaceName = rootPath.replace(/\\/g, '/').split('/').pop() || 'Workspace';
    const entryTypes = Object.values(config.entries);
    
    const folderList = entryTypes
        .map(e => `- **${e.folder}/**: ${e.label} — ${e.description || ''}`)
        .join('\n');

    return `# ${workspaceName}

> Created with [Citadel](https://github.com/iwannabebot/citadel) — Smart hackable workspace for software engineers and others.

## Structure

${folderList}

## Getting Started

1. Open this folder in Citadel
2. Create entries using the sidebar or \`Ctrl+N\`
3. Your work is saved as plain markdown files, version-controlled with Git
`;
}

/**
 * Default .gitignore content for a Codex workspace.
 */
export const DEFAULT_GIT_IGNORE = `# Citadel local data
.codex/local/
.codex/config/feeds.db*
.codex/config/*.json

# Dependencies
node_modules/

# Databases
*.db
*.db-journal

# OS files
.DS_Store
Thumbs.db
Desktop.ini

# Editor artifacts
*.swp
*.swo
*~
`;
