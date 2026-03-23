import { BrowserWindow } from 'electron';
import * as chokidar from 'chokidar';
import { MainRegistrar } from '@citadel-app/core';


export class FileWatcherService {
  private watcher: chokidar.FSWatcher | null = null;

  constructor(private registrar: MainRegistrar<'@citadel-app/base'>) {
    this.registerHandlers();
  }

  private registerHandlers() {
    this.registrar.handle('fs.watchPath', async (watchPath: string | null) => {
      // Logic for authorization now lives in GuardrailService.setActiveWorkspace
      // and dialog-based allowPathTemporarily. 
      // We don't validate here to avoid race conditions when switching workspaces.
      return this.setWatchPath(watchPath);
    });
  }

  public setWatchPath(watchPath: string | null) {
    if (this.watcher) {
      try {
        this.watcher.close();
      } catch (e) {
        console.error('[FileWatcherService] Error closing watcher:', e);
      }
      this.watcher = null;
    }

    if (!watchPath) return;

    console.log(`[FileWatcherService] Starting watch on: ${watchPath}`);

    const watchOptions: chokidar.WatchOptions = {
        ignored: /(^|[\/\\])\../, // ignore dotfiles
        persistent: true,
        ignoreInitial: true,
        depth: 3
    };

    try {
        // Primary attempt: Default options (uses fsevents on macOS)
        this.watcher = chokidar.watch(watchPath, watchOptions);
        this.setupListeners();
    } catch (e: any) {
        console.warn(`[FileWatcherService] Initial watch attempt failed: ${e.message}. Retrying with polling/no-fsevents...`);
        
        try {
            // Fallback: Disable fsevents if it fails (common on macOS with bundling/linking issues)
            this.watcher = chokidar.watch(watchPath, {
                ...watchOptions,
                useFsEvents: false,
                usePolling: process.platform === 'win32' // standard for Windows, safer fallback for Mac
            });
            this.setupListeners();
        } catch (retryError: any) {
            console.error(`[FileWatcherService] Critical failure starting file watcher: ${retryError.message}`);
        }
    }
  }

  private setupListeners() {
    if (!this.watcher) return;
    this.watcher
      .on('add', (filePath) => this.notifyRenderer('add', filePath))
      .on('change', (filePath) => this.notifyRenderer('change', filePath))
      .on('unlink', (filePath) => this.notifyRenderer('unlink', filePath))
      .on('error', (error) => console.error(`[FileWatcherService] Chokidar Error: ${error}`));
  }

  private notifyRenderer(type: 'add' | 'change' | 'unlink', filePath: string) {
    // Only care about markdown files for the data manager
    if (!filePath.endsWith('.md')) return;

    const windows = BrowserWindow.getAllWindows();
    if (windows.length > 0) {
      console.log(`[FileWatcherService] Event: ${type} -> ${filePath}`);
      windows[0].webContents.send('fs.onFileChanged', { type, path: filePath });
    }
  }

  public close() {
    if (this.watcher) {
      console.log('[FileWatcherService] Closing watcher...');
      this.watcher.close();
      this.watcher = null;
    }
  }
}
