const fs = require('fs');
const path = require('path');
const reposDir = 'C:\\code\\citadel';
const plugins = fs.readdirSync(reposDir).filter(name => name.startsWith('citadel-plugin-') && name !== 'citadel-plugin-sdk');

plugins.forEach(repo => {
    const pkgPath = path.join(reposDir, repo, 'package.json');
    const vitePath = path.join(reposDir, repo, 'vite.config.ts');

    if (!fs.existsSync(pkgPath) || !fs.existsSync(vitePath)) return;

    // 1. Rewrite vite.config.ts to use Vite's native functional config hook
    const newViteConfig = `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

const external = [
  'react', 'react-dom', 'react/jsx-runtime', 'react-router-dom',
  '@citadel-app/core', '@citadel-app/ui', '@citadel-app/sdk',
  'lucide-react', '@radix-ui/react-dropdown-menu', '@radix-ui/react-slot', 'clsx', 'tailwind-merge',
  'electron', '@electron-toolkit/utils', 'fs', 'fs-extra', 'path', 'os', 'http', 'net',
  'child_process', 'util', 'events', 'stream', 'url', 'crypto', 'module', 'better-sqlite3', 'ws'
];

export default defineConfig(({ mode }) => {
  const isMain = mode === 'main';

  return {
    plugins: [react()],
    build: {
      outDir: 'dist',
      emptyOutDir: isMain, // Only clear during main pass so renderer doesn't get wiped
      lib: {
        entry: path.resolve(__dirname, isMain ? 'src/main/index.ts' : 'src/renderer/index.ts'),
        formats: ['cjs']
      },
      rollupOptions: {
        external,
        output: {
          inlineDynamicImports: true,
          entryFileNames: isMain ? 'main.js' : 'renderer.js'
        }
      }
    }
  };
});
`;
    fs.writeFileSync(vitePath, newViteConfig);

    // 2. Rewrite package.json scripts to use native Vite CLI modes
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    pkg.scripts = pkg.scripts || {};
    
    pkg.scripts['build:main'] = "vite build --mode main";
    pkg.scripts['build:renderer'] = "vite build --mode renderer";
    pkg.scripts['build'] = "npm run build:main && npm run build:renderer";
    
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));

    console.log(`Patched Native Vite builder in ${repo}`);
});
