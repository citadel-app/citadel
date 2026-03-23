import fs from 'fs'
import { resolve, extname } from 'path'
import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {
    resolve: {
      alias: {
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
      react(),
      {
        name: 'serve-excalidraw-assets',
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            if (req.url?.startsWith('/excalidraw-assets/')) {
              const filePath = resolve(__dirname, 'packages/modules/excalidraw/public', req.url.slice(1).split('?')[0]);
              if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
                const ext = extname(filePath);
                let mime = 'application/octet-stream';
                if (ext === '.woff2') mime = 'font/woff2';
                else if (ext === '.js') mime = 'application/javascript';
                else if (ext === '.json') mime = 'application/json';
                else if (ext === '.css') mime = 'text/css';
                res.setHeader('Content-Type', mime);
                // Also set CORS headers if needed
                res.setHeader('Access-Control-Allow-Origin', '*');
                fs.createReadStream(filePath).pipe(res);
                return;
              }
            }
            next();
          });
        },
        closeBundle() {
          try {
            const src = resolve(__dirname, 'packages/modules/excalidraw/public/excalidraw-assets');
            const dest = resolve(__dirname, 'out/renderer/excalidraw-assets');
            if (fs.existsSync(src)) {
              if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
              fs.cpSync(src, dest, { recursive: true });
              console.log('[plugin-static-copy] Copied Excalidraw assets to', dest);
            }
          } catch (e) {
            console.error('[plugin-static-copy] Failed to copy Excalidraw assets:', e);
          }
        }
      }
    ],
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
