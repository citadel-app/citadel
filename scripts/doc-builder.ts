import { Application, TSConfigReader, TypeDocReader } from 'typedoc';
import * as reactDocgen from 'react-docgen-typescript';
import * as fs from 'fs-extra';
import * as path from 'path';
import { glob } from 'glob';

const ROOT_DIR = process.cwd();
const DOCS_DIR = path.join(ROOT_DIR, 'docs');
const LOGIC_RAW_JSON = path.join(DOCS_DIR, 'logic-raw.json');
const UI_RAW_JSON = path.join(DOCS_DIR, 'ui-raw.json');

const APP_DOCS_JSON = path.join(DOCS_DIR, 'app-api.json');
const CORE_DOCS_JSON = path.join(DOCS_DIR, 'core-api.json');
const UI_DOCS_JSON = path.join(DOCS_DIR, 'ui-api.json');
const FINAL_DOCS_JSON = path.join(DOCS_DIR, 'api-docs.json');

const STAGE = process.argv.includes('--stage') ? process.argv[process.argv.indexOf('--stage') + 1] : 'all';

async function extractLogic() {
    console.log('--- Extracting Logic (TypeDoc) ---');
    
    // Manually find entry points since 'packages' strategy might fail if dist is missing
    const packageFiles = await glob(['packages/*/package.json', 'packages/modules/*/package.json'], { absolute: true });
    const entryPoints: string[] = [];

    for (const pkgFile of packageFiles) {
        const pkgDir = path.dirname(pkgFile);
        const possibleEntries = [
            path.join(pkgDir, 'src', 'index.ts'),
            path.join(pkgDir, 'src', 'main', 'index.ts'),
            path.join(pkgDir, 'src', 'renderer', 'index.ts'),
            path.join(pkgDir, 'src', 'main.ts'),
            path.join(pkgDir, 'index.ts')
        ];

        for (const entry of possibleEntries) {
            if (fs.existsSync(entry)) {
                const relativePath = path.relative(ROOT_DIR, entry).replace(/\\/g, '/');
                entryPoints.push(relativePath);
                break;
            }
        }
    }

    console.log(`Discovered ${entryPoints.length} entry points for TypeDoc:`);
    entryPoints.forEach(ep => console.log(` - ${ep}`));

    const app = await Application.bootstrapWithPlugins({
        entryPoints,
        tsconfig: path.join(ROOT_DIR, 'tsconfig.base.json'),
        plugin: []
    });
    app.options.addReader(new TSConfigReader());
    app.options.addReader(new TypeDocReader());

    const project = await app.convert();
    if (project) {
        if (!fs.existsSync(DOCS_DIR)) fs.mkdirpSync(DOCS_DIR);
        await app.generateJson(project, LOGIC_RAW_JSON);
        console.log(`Logic documentation saved to ${LOGIC_RAW_JSON}`);
    } else {
        console.error('Failed to convert project with TypeDoc');
        process.exit(1);
    }
}

async function extractUI() {
    console.log('--- Extracting UI (react-docgen-typescript) ---');
    const uiDir = path.join(ROOT_DIR, 'packages', 'ui');
    if (!fs.existsSync(uiDir)) {
        console.warn('packages/ui not found, skipping UI extraction');
        return;
    }

    const tsxFiles = await glob('packages/ui/src/components/**/*.tsx', { absolute: true });
    console.log(`Found ${tsxFiles.length} component files`);

    const parser = reactDocgen.withDefaultConfig({
        propFilter: {
            skipPropsWithName: ['key', 'ref']
        }
    });

    const results = tsxFiles.map(file => {
        try {
            return parser.parse(file);
        } catch (e) {
            console.error(`Error parsing ${file}:`, e);
            return [];
        }
    }).flat();

    if (!fs.existsSync(DOCS_DIR)) fs.mkdirpSync(DOCS_DIR);
    await fs.writeJson(UI_RAW_JSON, results, { spaces: 2 });
    console.log(`UI documentation saved to ${UI_RAW_JSON}`);
}

async function mergeDocs() {
    console.log('--- Merging Documentation ---');
    if (!fs.existsSync(LOGIC_RAW_JSON) || !fs.existsSync(UI_RAW_JSON)) {
        console.error('Logic or UI raw documentation missing. Run extraction first.');
        return;
    }

    const logicDocs = await fs.readJson(LOGIC_RAW_JSON);
    const uiDocs = await fs.readJson(UI_RAW_JSON);

    const appLogic: any[] = [];
    const coreLogic: any[] = [];
    const uiLogic: any[] = [];

    if (logicDocs.children) {
        for (const child of logicDocs.children) {
            const fileName = child.sources?.[0]?.fileName || '';
            if (fileName.startsWith('packages/core')) {
                coreLogic.push(child);
            } else if (fileName.startsWith('packages/ui')) {
                uiLogic.push(child);
            } else {
                appLogic.push(child);
            }
        }
    }

    const timestamp = new Date().toISOString();

    const appFinal = { version: '1.0.0', timestamp, logic: { ...logicDocs, children: appLogic } };
    const coreFinal = { version: '1.0.0', timestamp, logic: { ...logicDocs, children: coreLogic } };
    const uiFinal = { version: '1.0.0', timestamp, logic: { ...logicDocs, children: uiLogic }, components: uiDocs };

    await fs.writeJson(APP_DOCS_JSON, appFinal, { spaces: 2 });
    await fs.writeJson(CORE_DOCS_JSON, coreFinal, { spaces: 2 });
    await fs.writeJson(UI_DOCS_JSON, uiFinal, { spaces: 2 });

    const masterFinal = {
        version: '1.0.0',
        timestamp,
        app: appFinal,
        core: coreFinal,
        ui: uiFinal
    };
    await fs.writeJson(FINAL_DOCS_JSON, masterFinal, { spaces: 2 });

    console.log(`Documentation saved to:
 - ${APP_DOCS_JSON}
 - ${CORE_DOCS_JSON}
 - ${UI_DOCS_JSON}
 - ${FINAL_DOCS_JSON}`);
}

async function main() {
    try {
        if (STAGE === 'all' || STAGE === 'extract-logic') {
            await extractLogic();
        }
        if (STAGE === 'all' || STAGE === 'extract-ui') {
            await extractUI();
        }
        if (STAGE === 'all' || STAGE === 'merge') {
            await mergeDocs();
        }
        console.log('Documentation build finished.');
    } catch (error) {
        console.error('Error during documentation build:', error);
        process.exit(1);
    }
}

main();
