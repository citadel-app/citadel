import * as fs from 'fs-extra';
import * as path from 'path';
import { glob } from 'glob';

const ROOT_DIR = process.cwd();
const ROOT_PKG_PATH = path.join(ROOT_DIR, 'package.json');
const CORE_CONSTANTS_PATH = path.join(ROOT_DIR, 'packages/core/src/constants.ts');

async function syncVersions() {
    console.log('--- Synchronizing Versions ---');
    
    if (!fs.existsSync(ROOT_PKG_PATH)) {
        console.error('Root package.json not found!');
        process.exit(1);
    }

    const rootPkg = await fs.readJson(ROOT_PKG_PATH);
    const version = rootPkg.version;
    console.log(`Source version: ${version}`);

    // 1. Sync all workspace package.json files
    const workspacePkgs = await glob(['packages/*/package.json', 'packages/modules/*/package.json'], { absolute: true });
    for (const pkgPath of workspacePkgs) {
        const pkg = await fs.readJson(pkgPath);
        if (pkg.version !== version) {
            pkg.version = version;
            await fs.writeJson(pkgPath, pkg, { spaces: 2 });
            console.log(`Updated ${path.relative(ROOT_DIR, pkgPath)}`);
        }
    }

    // 2. Sync core constants.ts
    if (fs.existsSync(CORE_CONSTANTS_PATH)) {
        let content = await fs.readFile(CORE_CONSTANTS_PATH, 'utf-8');
        const versionRegex = /export const APP_VERSION = '.*?';/;
        const newDeclaration = `export const APP_VERSION = '${version}';`;
        
        if (versionRegex.test(content)) {
            content = content.replace(versionRegex, newDeclaration);
            await fs.writeFile(CORE_CONSTANTS_PATH, content);
            console.log(`Updated APP_VERSION in ${path.relative(ROOT_DIR, CORE_CONSTANTS_PATH)}`);
        } else {
            // If it doesn't exist, prepend it
            content = `${newDeclaration}\n\n${content}`;
            await fs.writeFile(CORE_CONSTANTS_PATH, content);
            console.log(`Added APP_VERSION to ${path.relative(ROOT_DIR, CORE_CONSTANTS_PATH)}`);
        }
    }

    console.log('Version synchronization complete.');
}

syncVersions().catch(err => {
    console.error('Error during version sync:', err);
    process.exit(1);
});
