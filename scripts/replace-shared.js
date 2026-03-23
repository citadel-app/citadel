const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            if (!file.includes('node_modules') && !file.includes('.git') && !file.includes('out') && !file.includes('dist')) {
                results = results.concat(walk(file));
            }
        } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
            results.push(file);
        }
    });
    return results;
}

const files = [...walk('src'), ...walk('packages')];
let changed = 0;

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    if (content.includes('@shared')) {
        // Replace from '@shared' or from "@shared" with '@citadel-app/core'
        let newContent = content.replace(/from\s+['"]@shared(\/[^'"]*)?['"]/g, "from '@citadel-app/core$1'");
        newContent = newContent.replace(/import\(['"]@shared(\/[^'"]*)?['"]\)/g, "import('@citadel-app/core$1')");
        
        // General match for '@shared'
        newContent = newContent.replace(/['"]@shared['"]/g, "'@citadel-app/core'");

        if (content !== newContent) {
            fs.writeFileSync(file, newContent);
            changed++;
            console.log('Updated', file);
        }
    }
});

console.log('Total files changed:', changed);
