const fs = require('fs');
const path = require('path');

const dirsToClean = ['dist', 'out', 'build'];

dirsToClean.forEach(dir => {
    const dirPath = path.join(__dirname, '..', dir);
    if (fs.existsSync(dirPath)) {
        fs.rmSync(dirPath, { recursive: true, force: true });
        console.log(`Cleaned ${dir}`);
    } else {
        console.log(`Directory ${dir} not found, skipping.`);
    }
});
