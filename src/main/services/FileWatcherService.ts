import { ipcMain, BrowserWindow } from 'electron';
import * as chokidar from 'chokidar';
import { IPC_CHANNELS } from '@shared';

import { GuardrailService } from './GuardrailService';

export class FileWatcherService {
  private watcher: chokidar.FSWatcher | null = null;
  private guardrail: GuardrailService;

  constructor(guardrail: GuardrailService) {
    this.guardrail = guardrail;
    this.registerHandlers();
  }

  private registerHandlers() {
    ipcMain.handle(IPC_CHANNELS.FS_WATCH_PATH, async (_, watchPath: string | null) => {
      if (watchPath) {
        this.guardrail.validate(watchPath);
      }
      return this.setWatchPath(watchPath);
    });
  }

  public setWatchPath(watchPath: string | null) {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }

    // this.currentPath = watchPath;

    if (!watchPath) return;

    console.log(`[FileWatcherService] Starting watch on: ${watchPath}`);

    // Watch for .md file changes, additions, and deletions
    this.watcher = chokidar.watch(watchPath, {
      ignored: /(^|[\/\\])\../, // ignore dotfiles
      persistent: true,
      ignoreInitial: true,
      depth: 3 // Only watch logical depth of the vault structure
    });

    this.watcher
      .on('add', (filePath) => this.notifyRenderer('add', filePath))
      .on('change', (filePath) => this.notifyRenderer('change', filePath))
      .on('unlink', (filePath) => this.notifyRenderer('unlink', filePath));
  }

  private notifyRenderer(type: 'add' | 'change' | 'unlink', filePath: string) {
    // Only care about markdown files for the data manager
    if (!filePath.endsWith('.md')) return;

    const windows = BrowserWindow.getAllWindows();
    if (windows.length > 0) {
      console.log(`[FileWatcherService] Event: ${type} -> ${filePath}`);
      windows[0].webContents.send(IPC_CHANNELS.FS_ON_FILE_CHANGED, { type, path: filePath });
    }
  }
}
