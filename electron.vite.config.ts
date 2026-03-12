import { resolve } from 'path'
import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {
    resolve: {
      alias: {
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
        '@renderer': resolve('src/renderer/src'),
        '@shared': resolve('src/shared/index.ts'),
        'lodash': 'lodash-es'
      }
    },
    define: {
      'process.env.IS_PREACT': JSON.stringify('false')
    },
    plugins: [react()],
    optimizeDeps: {
      include: ['es6-promise-pool']
    },
    build: {
      rollupOptions: {
        external: ['canvas'],
        output: {
          manualChunks: {
            'monaco-editor': ['monaco-editor'],
            'excalidraw': ['@excalidraw/excalidraw'],
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
