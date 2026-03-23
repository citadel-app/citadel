const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
            results.push(file);
        }
    });
    return results;
}

const files = [...walk('src/main'), ...walk('src/preload')];
let changed = 0;

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let newContent = content.replace(/from\s+['"](?:\.\.\/)+shared(\/[^'"]*)?['"]/g, "from '@citadel-app/core$1'");
    newContent = newContent.replace(/import\(['"](?:\.\.\/)+shared(\/[^'"]*)?['"]\)/g, "import('@citadel-app/core$1')");
    
    if (content !== newContent) {
        fs.writeFileSync(file, newContent);
        changed++;
        console.log('Updated', file);
    }
});

console.log('Total files changed:', changed);
