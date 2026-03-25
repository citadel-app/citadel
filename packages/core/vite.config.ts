import { defineConfig } from 'vite';
import { resolve } from 'path';
import { builtinModules } from 'module';
import pkg from './package.json' with { type: 'json' };

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    lib: {
      entry: {
        'index': resolve(__dirname, 'src/index.ts'),
        'index.node': resolve(__dirname, 'src/index.node.ts')
      },
      formats: ['es', 'cjs'],
      fileName: (format, entryName) => `${entryName}.${format === 'es' ? 'js' : 'cjs'}`,
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
