
import fs from 'fs-extra';
import path from 'path';

const srcDir = path.resolve('node_modules/@excalidraw/excalidraw/dist/prod');
const destDir = path.resolve('src/renderer/public/excalidraw-assets');

async function copyAssets() {
    try {
        await fs.copy(srcDir, destDir, { overwrite: true });
        console.log('Excalidraw assets copied successfully to', destDir);
    } catch (err) {
        console.error('Error copying Excalidraw assets:', err);
    }
}

copyAssets();
