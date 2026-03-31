const fs = require('fs');
const path = require('path');

const reposDir = 'C:\\code\\citadel';
const pluginRepos = fs.readdirSync(reposDir).filter(name => name.startsWith('citadel-plugin-') && name !== 'citadel-plugin-sdk');

pluginRepos.forEach(repo => {
    const yamlPath = path.join(reposDir, repo, '.github', 'workflows', 'release.yml');
    if (!fs.existsSync(yamlPath)) return;

    let content = fs.readFileSync(yamlPath, 'utf8');

    // Make sure we haven't already patched it
    if (content.includes('features: {permissions:')) {
        console.log(`Already patched ${repo}`);
        return;
    }

    // Update payload JQ command to compress the features
    const jqRegex = /permissions: \$perms, capabilities: \$caps, sidecars: \$sidecars\}\}'\)/g;
    const jqReplacement = `features: {permissions: $perms, capabilities: $caps, sidecars: $sidecars}}}')`;
    
    content = content.replace(jqRegex, jqReplacement);

    fs.writeFileSync(yamlPath, content);
    console.log(`Patched API limit structure in ${repo}`);
});
