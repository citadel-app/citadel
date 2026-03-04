import simpleGit, { SimpleGit } from 'simple-git';
import { ipcMain } from 'electron';

export class GitService {
  private git: SimpleGit | null = null;
  private currentRepoPath: string | null = null;

  constructor() {
    console.log('[GitService] Initializing...');
    this.registerIpcHandlers();
  }

  private registerIpcHandlers() {
    console.log('[GitService] Registering IPC handlers...');
    ipcMain.handle('git:status', async (_, repoPath: string) => {
      return this.getStatus(repoPath);
    });

    ipcMain.handle('git:init', async (_, repoPath: string) => {
      return this.init(repoPath);
    });

    ipcMain.handle('git:add', async (_, repoPath: string, files: string[]) => {
      return this.add(repoPath, files);
    });

    ipcMain.handle('git:commit', async (_, repoPath: string, message: string) => {
      return this.commit(repoPath, message);
    });

    ipcMain.handle('git:push', async (_, repoPath: string, remote?: string, branch?: string) => {
        return this.push(repoPath, remote, branch);
    });

    ipcMain.handle('git:pull', async (_, repoPath: string, remote?: string, branch?: string) => {
        return this.pull(repoPath, remote, branch);
    });
    
    ipcMain.handle('git:add-remote', async (_, repoPath: string, name: string, url: string) => {
        return this.addRemote(repoPath, name, url);
    });

    ipcMain.handle('git:history', async (_, repoPath: string) => {
        return this.getHistory(repoPath);
    });
    
    ipcMain.handle('git:get-remotes', async (_, repoPath: string) => {
        return this.getRemotes(repoPath);
    });


    ipcMain.handle('git:show', async (_, repoPath: string, args: string) => {
        return this.show(repoPath, args);
    });

    ipcMain.handle('git:check-is-repo', async (_, repoPath: string) => {
        return this.isRepo(repoPath);
    });

    ipcMain.handle('git:get-branches', async (_, repoPath: string) => {
        return this.getBranches(repoPath);
    });

    ipcMain.handle('git:checkout', async (_, repoPath: string, branch: string) => {
        return this.checkout(repoPath, branch);
    });

    ipcMain.handle('git:clone', async (_, url: string, targetPath: string) => {
        return this.clone(url, targetPath);
    });

    ipcMain.handle('git:discard', async (_, repoPath: string, filePath: string) => {
        return this.discard(repoPath, filePath);
    });

    ipcMain.handle('git:create-branch', async (_, repoPath: string, branchName: string) => {
        return this.createBranch(repoPath, branchName);
    });

    ipcMain.handle('git:delete-branch', async (_, repoPath: string, branchName: string) => {
        return this.deleteBranch(repoPath, branchName);
    });

    ipcMain.handle('git:setConfig', async (_, repoPath: string, key: string, value: string) => {
        const git = this.getGit(repoPath);
        await git.addConfig(key, value, false, 'local');
    });
  }

  private getGit(repoPath: string): SimpleGit {
    if (this.currentRepoPath !== repoPath || !this.git) {
      this.currentRepoPath = repoPath;
      this.git = simpleGit(repoPath);
    }
    return this.git;
  }

  async isRepo(repoPath: string): Promise<boolean> {
     try {
         const git = this.getGit(repoPath);
         return await git.checkIsRepo();
     } catch (e) {
         console.error('Error checking repo:', e);
         return false;
     }
  }

  async show(repoPath: string, args: string): Promise<string> {
      const git = this.getGit(repoPath);
      return await git.show([args]);
  }

  async getStatus(repoPath: string): Promise<any> {
    const git = this.getGit(repoPath);
    const status = await git.status();
    // Sanitize for IPC - explicit copy to avoid non-cloneable properties
    return JSON.parse(JSON.stringify({
        current: status.current,
        tracking: status.tracking,
        ahead: status.ahead,
        behind: status.behind,
        files: status.files
    }));
  }

  async init(repoPath: string): Promise<void> {
    const git = simpleGit(repoPath);
    await git.init();
    try {
        await git.raw(['branch', '-M', 'main']);
    } catch (e) {
        console.warn('Failed to rename branch to main:', e);
    }
    this.currentRepoPath = repoPath;
    this.git = git;
  }

  async add(repoPath: string, files: string[]): Promise<void> {
    const git = this.getGit(repoPath);
    await git.add(files);
  }

  async commit(repoPath: string, message: string): Promise<void> {
    const git = this.getGit(repoPath);
    await git.commit(message);
  }
  
  async push(repoPath: string, remote?: string, branch?: string): Promise<void> {
      console.log(`[GitService] Pushing... path=${repoPath} remote=${remote} branch=${branch}`);
      const git = this.getGit(repoPath);
      if (remote && branch) {
          try {
              // Ensure we have latest refs (might fail if auth fails, but good to try)
              await git.fetch(remote);
          } catch (e) {
              console.warn('[GitService] Fetch failed before push:', e);
          }
          // Use raw command to ensure -u is passed correctly
          await git.raw(['push', '-u', remote, branch]);
      } else {
          await git.push();
      }
  }

  async pull(repoPath: string, remote?: string, branch?: string): Promise<void> {
      const git = this.getGit(repoPath);
      if (remote && branch) {
          await git.pull(remote, branch);
      } else {
          await git.pull();
      }
  }

  async addRemote(repoPath: string, name: string, url: string): Promise<void> {
      const git = this.getGit(repoPath);
      await git.addRemote(name, url);
  }
  
  async getHistory(repoPath: string) {
      const git = this.getGit(repoPath);
      try {
        const log = await git.log({ maxCount: 20 });
        return log;
      } catch (e) {
          return { all: [] };
      }
  }

  async getRemotes(repoPath: string) {
      const git = this.getGit(repoPath);
      try {
        return await git.getRemotes(true);
      } catch (e) {
          return [];
      }
  }

  async getBranches(repoPath: string) {
      const git = this.getGit(repoPath);
      try {
          const branches = await git.branchLocal();
          return branches; // Returns { all: string[], current: string, ... }
      } catch (e) {
          console.error("Failed to get branches", e);
          return { all: [], current: '' };
      }
  }

  async checkout(repoPath: string, branch: string) {
      const git = this.getGit(repoPath);
      await git.checkout(branch);
  }

  async clone(url: string, targetPath: string): Promise<void> {
      console.log(`[GitService] Cloning ${url} to ${targetPath}`);
      try {
        await simpleGit().clone(url, targetPath);
      } catch (e) {
          console.error('[GitService] Clone failed:', e);
          throw e; // Propagate error to renderer
      }
  }

  async discard(repoPath: string, filePath: string): Promise<void> {
      const git = this.getGit(repoPath);
      // 'checkout' with path argument discards changes in working directory
      await git.checkout([filePath]);
  }

  async createBranch(repoPath: string, branchName: string): Promise<void> {
      const git = this.getGit(repoPath);
      await git.checkoutLocalBranch(branchName);
  }

  async deleteBranch(repoPath: string, branchName: string): Promise<void> {
      const git = this.getGit(repoPath);
      // Force delete (-D) in case it's not merged, or just delete (-d)
      // Standard behavior usually is -d, but for a "power user" tool maybe force?
      // Let's stick to standard delete first, if it fails due to unmerged, we propagate error.
      await git.deleteLocalBranch(branchName);
  }

  async unstage(repoPath: string, files: string[]): Promise<void> {
      const git = this.getGit(repoPath);
      // 'reset' removes files from the index
      await git.reset(['--', ...files]);
  }

  async discardBulk(repoPath: string, files: string[]): Promise<void> {
      const git = this.getGit(repoPath);
      // 'checkout' with path argument discards changes in working directory
      await git.checkout(['--', ...files]);
  }

  async removeRemote(repoPath: string, name: string): Promise<void> {
      const git = this.getGit(repoPath);
      await git.removeRemote(name);
  }
}
