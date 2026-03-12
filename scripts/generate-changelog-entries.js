const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function getPackageJson() {
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    console.error('package.json not found in the current directory.');
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
}

function getRepoUrl(packageJson) {
  let url = packageJson.homepage || (packageJson.repository && packageJson.repository.url) || '';
  if (url.endsWith('.git')) {
    url = url.slice(0, -4);
  }
  if (url.startsWith('git+')) {
    url = url.slice(4);
  }
  return url;
}

function generateChangelog() {
  const [sourceBranch, targetBranch, lastCommit] = process.argv.slice(2);

  if (!sourceBranch || !targetBranch || !lastCommit) {
    console.error('Usage: node generate-changelog-entries.js <sourceBranch> <targetBranch> <lastCommit>');
    process.exit(1);
  }

  const packageJson = getPackageJson();
  const repoUrl = getRepoUrl(packageJson);

  try {
    // Get commits between lastCommit and sourceBranch
    const logCommand = `git log ${lastCommit}..${sourceBranch} --pretty=format:"%H|%h|%s"`;
    const logOutput = execSync(logCommand, { encoding: 'utf8' });

    if (!logOutput.trim()) {
      console.log('No new commits found.');
      return;
    }

    const commits = logOutput.trim().split('\n');
    const entries = commits.map(line => {
      const [fullSha, shortSha, message] = line.split('|');
      const commitLink = repoUrl ? ` ([${shortSha}](${repoUrl}/commit/${fullSha}))` : ` (${shortSha})`;
      return `* ${message}${commitLink}`;
    });

    console.log('\n### Generated Changelog Entries:\n');
    console.log(entries.join('\n'));
    console.log('\n');

  } catch (error) {
    console.error('Error executing git command:', error.message);
    process.exit(1);
  }
}

generateChangelog();
