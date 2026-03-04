const fs = require('fs');
const path = require('path');

const ICONS_ROOT = path.join(__dirname, '../src/renderer/src/assets/icons');
const OUTPUT_FILE = path.join(__dirname, '../src/renderer/src/config/cloud-icons.json');

// Ensure output dir exists
const outputDir = path.dirname(OUTPUT_FILE);
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

const PROVIDERS = ['aws-icons', 'azure-icons', 'gcp-icons'];

// Helper to crawl directory recursively
function getSvgFiles(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(getSvgFiles(file));
        } else if (file.toLowerCase().endsWith('.svg')) {
            results.push(file);
        }
    });
    return results;
}

// Logic to extract size from content or filename?
// Filename is easier/faster. content requires reading.
// AWS: _48.svg, _64.svg.
// Azure: no obvious size in name usually?
// GCP: -512-color
function getScore(filename) {
    if (filename.includes('_64')) return 64;
    if (filename.includes('_48')) return 48;
    if (filename.includes('512')) return 512;
    if (filename.includes('256')) return 256;
    if (filename.includes('128')) return 128;
    return 0; // Default
}

function normalizeName(filename, provider) {
    let name = path.basename(filename, '.svg');

    if (provider === 'aws') {
        // Remove Res_, Arch_
        name = name.replace(/^(Res|Arch)_/, '');
        // Remove Category prefix if present e.g. "Storage_" ?
        // Usually filenames are "Amazon-Elastic-..."
        // Remove numerical size suffix e.g. _48, _64
        name = name.replace(/_\d+$/, '');
        // Replace - with spaces? Or Keep as ID?
        // User wants Human Friendly.
        name = name.replace(/-/g, ' ');
        // Remove redundant "Amazon" or "AWS" prefix?
        // Maybe keep it for searchability?
        // Let's keep it but maybe trim?
        name = name.replace(/_/g, ' ');
    } else if (provider === 'azure') {
        // 00031-icon-service-Genomics.svg
        // Remove leading numbers and -icon-service-
        name = name.replace(/^\d+-icon-service-/, '');
        name = name.replace(/-/g, ' ');
    } else if (provider === 'gcp') {
        // CloudRun-512-color-rgb
        // Remove -512-color...
        name = name.replace(/-\d+(-color)?(-rgb)?$/, '');
        name = name.replace(/-/g, ' ');
    }

    return name.trim();
}

const iconMap = {};

PROVIDERS.forEach(providerDir => {
    const fullDir = path.join(ICONS_ROOT, providerDir);
    if (!fs.existsSync(fullDir)) {
        console.warn(`Directory not found: ${fullDir}`);
        return;
    }

    const providerKey = providerDir.replace('-icons', '').toUpperCase(); // AWS, AZURE, GCP
    const files = getSvgFiles(fullDir);

    console.log(`Scanning ${providerKey}: Found ${files.length} files.`);

    files.forEach(filePath => {
        // Calculate relative path for frontend to use
        // We want path relative to src/renderer/src
        // ICONS_ROOT is .../src/renderer/src/assets/icons
        // filePath is absolute.
        // relPath should start with 'assets/icons/...' to be matched with import.meta.glob('assets/icons/**')
        
        // Wait, import.meta.glob is relative to the file defining it. 
        // If ComponentLibrary is in src/renderer/src/components/modules/
        // then '../../assets/icons' works.
        // We should store path relative to 'src/renderer/src/assets/icons' for simplicity, or relative to src/renderer/src.
        
        // Let's store relative to 'src/renderer/src'
        const relativeToSrc = path.relative(path.join(__dirname, '../src/renderer/src'), filePath);
        // Ensure forward slashes for web
        const normalizedPath = relativeToSrc.split(path.sep).join('/');

        const cleanName = normalizeName(filePath, providerKey.toLowerCase());
        const score = getScore(filePath);

        // Deduplication Key: Provider + Name
        const key = `${providerKey}:${cleanName}`;

        if (!iconMap[key] || score > iconMap[key].score) {
            iconMap[key] = {
                label: cleanName,
                provider: providerKey,
                path: normalizedPath, // e.g. "assets/icons/aws-icons/..."
                score: score,
                // Try to infer category?
                // AWS paths have categories: Res_Storage/...
                // Azure paths: ai + machine learning/...
                // GCP paths: AI Hypercomputer/...
                category: inferCategory(filePath, providerKey.toLowerCase())
            };
        }
    });
});

function inferCategory(filePath, provider) {
    const parts = filePath.split(path.sep);
    // Rough heuristic: parent folder name
    // parts[parts.length - 2] might be '64' or 'Res_Storage' or 'ai + machine learning'
    let folder = parts[parts.length - 2];
    
    // Check if folder is size folder (number)
    if (/^\d+$/.test(folder)) {
        folder = parts[parts.length - 3];
    }

    if (provider === 'aws') {
        // Res_Storage -> Storage
        // Arch_Compute -> Compute
        if (folder.includes('_')) {
            return folder.split('_')[1] || folder;
        }
    }
    
    return folder || 'General';
}

const sortedIcons = Object.values(iconMap).sort((a, b) => a.label.localeCompare(b.label));

fs.writeFileSync(OUTPUT_FILE, JSON.stringify(sortedIcons, null, 2));
console.log(`Generated map with ${sortedIcons.length} unique icons at ${OUTPUT_FILE}`);
