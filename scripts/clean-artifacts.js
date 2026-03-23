const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const targetExtensions = ['.js', '.js.map', '.d.ts', '.d.ts.map'];

function walkAndClean(dir, insideSrc) {
    if (!fs.existsSync(dir)) return;
    
    // Ignore node_modules, dist, etc to speed up
    if (dir.includes('node_modules') || 
    dir.includes('dist') || 
    dir.includes('public') || 
    dir.includes('.git')) return;

    const isSrc = insideSrc || path.basename(dir) === 'src';
    const files = fs.readdirSync(dir);

    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            walkAndClean(fullPath, isSrc);
        } else if (isSrc) {
            // We are inside a 'src' directory (or subdirectory of it)
            for (const ext of targetExtensions) {
                if (file.endsWith(ext)) {
                    // Safety Check: Only delete if a corresponding .ts or .tsx file exists!
                    // This prevents deleting legitimate env.d.ts or native .js files.
                    const baseName = file.substring(0, file.length - ext.length);
                    const tsPath = path.join(dir, baseName + '.ts');
                    const tsxPath = path.join(dir, baseName + '.tsx');
                    
                    if (fs.existsSync(tsPath) || fs.existsSync(tsxPath)) {
                        console.log(`Deleting artifact: ${fullPath}`);
                        try {
                            fs.unlinkSync(fullPath);
                        } catch (e) {
                            console.error(`Failed to delete ${fullPath}`, e);
                        }
                    }
                    break;
                }
            }
        }
    }
}

console.log("Starting artifact cleanup...");
walkAndClean(rootDir, false);
console.log("Cleanup complete!");
