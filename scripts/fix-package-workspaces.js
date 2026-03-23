const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    if (!fs.existsSync(dir)) return results;
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            if (!file.includes('node_modules') && !file.includes('.git') && !file.includes('out') && !file.includes('dist')) {
                results = results.concat(walk(file));
            }
        } else if (file.endsWith('package.json')) {
            results.push(file);
        }
    });
    return results;
}

const files = walk('packages');
let changed = 0;

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let newContent = content.replace(/"workspace:\*"/g, '"*"');
    if (content !== newContent) {
        fs.writeFileSync(file, newContent);
        changed++;
        console.log('Updated workspace symlinks in', file);
    }
});

console.log('Total package.jsons changed:', changed);
