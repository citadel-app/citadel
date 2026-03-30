import fs from 'fs'
import { resolve, extname } from 'path'
import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {
    resolve: {
      alias: {
        '@citadel-app/core': resolve('packages/core/src/index.node.ts'),
        '@citadel-app/ui': resolve('packages/ui/src/index.ts'),
        '@citadel-app/sdk': resolve('packages/sdk/src/index.ts'),
        '@shared': resolve('src/shared/index.ts')
      }
    },
    build: {
      rollupOptions: {
        external: ['canvas', 'chokidar', 'fsevents']
      }
    }
  },
  preload: {
    resolve: {
      alias: {
        '@citadel-app/core': resolve('packages/core/src/index.ts'),
        '@citadel-app/ui': resolve('packages/ui/src/index.ts'),
        '@citadel-app/sdk': resolve('packages/sdk/src/index.ts'),
        '@shared': resolve('src/shared/index.ts')
      }
    },
    build: {
      rollupOptions: {
        external: ['canvas', 'chokidar', 'fsevents']
      }
    }
  },
  renderer: {
    resolve: {
      alias: {
        '@citadel-app/core': resolve('packages/core/src/index.ts'),
        '@citadel-app/ui': resolve('packages/ui/src/index.ts'),
        '@citadel-app/sdk': resolve('packages/sdk/src/index.ts'),
        '@app': resolve('src/renderer/src'),
        '@renderer': resolve('src/renderer/src'),
        '@shared': resolve('src/shared/index.ts'),
        'lodash': 'lodash-es'
      }
    },
    define: {
      'process.env.IS_PREACT': JSON.stringify('false')
    },
    server: {
      port: Number(process.env.VITE_PORT) || 5174
    },
    plugins: [
      react()
    ],
    optimizeDeps: {
      include: ['es6-promise-pool']
    },
    build: {
      rollupOptions: {
        external: ['canvas'],
        output: {
          manualChunks: {
            'tldraw': ['tldraw'],
            'pdfjs': ['pdfjs-dist'],
            'vendor-react': ['react', 'react-dom', 'react-router-dom'],
            'vendor-ui': ['lucide-react', 'clsx', 'tailwind-merge']
          }
        }
      }
    }
  }
})
