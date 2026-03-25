import { defineConfig } from 'vite';
import { resolve } from 'path';
import { builtinModules } from 'module';
import react from '@vitejs/plugin-react';
import pkg from './package.json' with { type: 'json' };

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      formats: ['es'],
      fileName: () => `index.js`,
    },
    rollupOptions: {
      external: [
        ...builtinModules,
        ...builtinModules.map(m => `node:${m}`),
        ...Object.keys(pkg.dependencies || {}),
        ...Object.keys((pkg as any).peerDependencies || {})
      ].map(pkgName => new RegExp(`^${pkgName}(/.*)?$`))
    }
  }
});
