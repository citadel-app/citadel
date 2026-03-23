const fs = require('fs');
const path = require('path');

const targetDirs = [
    path.resolve(__dirname, '..'),
    path.resolve(__dirname, '../../citadel-plugin-rss')
];

const extensions = ['.ts', '.tsx', '.js', '.jsx', '.json', '.md'];
const excludeDirs = ['node_modules', 'dist', 'out', '.git', '.codex'];

function walkAndReplace(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        if (excludeDirs.includes(file)) continue;
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            walkAndReplace(fullPath);
        } else if (extensions.includes(path.extname(fullPath))) {
            const content = fs.readFileSync(fullPath, 'utf8');
            if (content.includes('@citadel-app/')) {
                const newContent = content.replace(/@citadel\//g, '@citadel-app/');
                fs.writeFileSync(fullPath, newContent, 'utf8');
                console.log('Updated', fullPath);
            }
        }
    }
}

targetDirs.forEach(dir => {
    if (fs.existsSync(dir)) walkAndReplace(dir);
});

console.log('Scope replacement complete.');
