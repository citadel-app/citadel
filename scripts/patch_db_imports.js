const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '../src/renderer/src');
const coreTypes = ['CodexEntry', 'IndexStatus', 'ChatMessage', 'WhiteboardData', 'EditorData', 'NotesData', 'LatexData', 'ChatSession'];

function processFile(filePath) {
    if (!fs.existsSync(filePath)) return;
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
        const files = fs.readdirSync(filePath);
        for (const file of files) {
            processFile(path.join(filePath, file));
        }
    } else if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
        let content = fs.readFileSync(filePath, 'utf8');
        let originalContent = content;

        // Matches import { ... } from '.../lib/db' or import type { ... } from '.../lib/db'
        const dbImportRegex = /import\s+(?:type\s+)?{([^}]+)}\s+from\s+['"](?:\.\.\/)*lib\/db['"];?/g;
        let match;
        let newContent = originalContent;
        let requiresCoreImport = false;
        let coreImportsSet = new Set();
        
        while ((match = dbImportRegex.exec(originalContent)) !== null) {
            const importString = match[0];
            const importPathMatch = importString.match(/['"](.*)['"]/);
            if (!importPathMatch) continue;
            
            const importPath = importPathMatch[1];
            const importedItems = match[1].split(',').map(s => s.trim()).filter(Boolean);
            
            const coreImports = [];
            const dbImports = [];
            
            for (const item of importedItems) {
                // Handle "type CodexEntry"
                const cleanItem = item.replace(/^type\s+/, '');
                if (coreTypes.includes(cleanItem)) {
                    coreImports.push(item);
                    coreImportsSet.add(cleanItem); // Track exactly what we need
                    requiresCoreImport = true;
                } else {
                    dbImports.push(item);
                }
            }
            
            if (coreImports.length > 0) {
                let replacement = '';
                if (dbImports.length > 0) {
                    replacement = `import { ${dbImports.join(', ')} } from '${importPath}';`;
                }
                
                newContent = newContent.replace(importString, replacement);
            }
        }

        if (requiresCoreImport) {
            // Check if @citadel-app/core is already imported
            const coreImportRegex = /import\s+{([^}]+)}\s+from\s+['"]@citadel\/core['"];?/;
            const coreMatch = newContent.match(coreImportRegex);
            
            if (coreMatch) {
                // Merge
                const existingItems = coreMatch[1].split(',').map(s => s.trim()).filter(Boolean);
                const existingCleanItems = new Set(existingItems.map(i => i.replace(/^type\s+/, '')));
                
                for (const item of coreImportsSet) {
                    if (!existingCleanItems.has(item)) {
                        existingItems.push(`type ${item}`);
                    }
                }
                
                newContent = newContent.replace(coreImportRegex, `import { ${existingItems.join(', ')} } from '@citadel-app/core';`);
            } else {
                // Prepend to the top of the file (after other imports)
                // Just put it at the top
                const importStr = `import type { ${Array.from(coreImportsSet).join(', ')} } from '@citadel-app/core';\n`;
                newContent = importStr + newContent;
            }
        }

        // Clean up any empty imports from lib/db that might have resulted
        newContent = newContent.replace(/import\s+{\s*}\s+from\s+['"](?:\.\.\/)*lib\/db['"];?\n?/g, '');
        // Clean up double blank lines at top if we added imports
        newContent = newContent.replace(/^import type {.*} from '@citadel\/core';\n\n+/g, match => match.trim() + '\n\n');

        if (newContent !== originalContent) {
            fs.writeFileSync(filePath, newContent, 'utf8');
            console.log('Patched: ' + filePath);
        }
    }
}

console.log('Starting script for ' + srcDir);
processFile(srcDir);
