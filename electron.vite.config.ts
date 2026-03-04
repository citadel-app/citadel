import { resolve } from 'path'
import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {},
  preload: {},
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src'),
        'lodash': 'lodash-es'
      }
    },
    define: {
      'process.env.IS_PREACT': JSON.stringify('false')
    },
    plugins: [react()],
    build: {
      rollupOptions: {
        external: ['pdfjs-dist/build/pdf.worker.min.mjs?url'],
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
