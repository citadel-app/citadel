import simpleGit, { SimpleGit } from 'simple-git';
import {  } from 'electron';
import { MainRegistrar } from '@citadel-app/core';

import { GuardrailService } from './GuardrailService';

export class GitService {
  private git: SimpleGit;
  private currentRepoPath: string = '';
  private guardrail: GuardrailService;

  constructor(guardrail: GuardrailService, private registrar: MainRegistrar<'@citadel-app/base'>) {
    this.guardrail = guardrail;
    this.git = simpleGit();
    this.registerHandlers();
  }

  private registerHandlers() {
    console.log('[GitService] Registering IPC handlers...');
    this.registrar.handle('git.status', async (repoPath: string) => {
      this.guardrail.validate(repoPath);
      return this.getStatus(repoPath);
    });

    this.registrar.handle('git.init', async (repoPath: string) => {
      this.guardrail.validate(repoPath);
      return this.init(repoPath);
    });

    this.registrar.handle('git.add', async (repoPath: string, files: string[]) => {
      this.guardrail.validate(repoPath);
      return this.add(repoPath, files);
    });

    this.registrar.handle('git.commit', async (repoPath: string, message: string) => {
      this.guardrail.validate(repoPath);
      return this.commit(repoPath, message);
    });

    this.registrar.handle('git.push', async (repoPath: string, remote?: string, branch?: string) => {
        this.guardrail.validate(repoPath);
        return this.push(repoPath, remote, branch);
    });

    this.registrar.handle('git.pull', async (repoPath: string, remote?: string, branch?: string) => {
        this.guardrail.validate(repoPath);
        return this.pull(repoPath, remote, branch);
    });
    
    this.registrar.handle('git.addRemote', async (repoPath: string, name: string, url: string) => {
        this.guardrail.validate(repoPath);
        return this.addRemote(repoPath, name, url);
    });

    this.registrar.handle('git.history', async (repoPath: string) => {
        this.guardrail.validate(repoPath);
        return this.getHistory(repoPath);
    });
    
    this.registrar.handle('git.getRemotes', async (repoPath: string) => {
        this.guardrail.validate(repoPath);
        return this.getRemotes(repoPath);
    });


    this.registrar.handle('git.show', async (repoPath: string, args: string) => {
        this.guardrail.validate(repoPath);
        // Harden: Only allow specific safe args for 'show' to prevent arbitrary execution
        const safeArgs = args.split(' ').filter(a => !a.startsWith('-') || a === '--pretty=format:%B');
        return this.show(repoPath, safeArgs.join(' '));
    });

    this.registrar.handle('git.checkIsRepo', async (repoPath: string) => {
        this.guardrail.validate(repoPath);
        return this.isRepo(repoPath);
    });

    this.registrar.handle('git.getBranches', async (repoPath: string) => {
        this.guardrail.validate(repoPath);
        return this.getBranches(repoPath);
    });

    this.registrar.handle('git.checkout', async (repoPath: string, branch: string) => {
        this.guardrail.validate(repoPath);
        return this.checkout(repoPath, branch);
    });

    this.registrar.handle('git.clone', async (url: string, targetPath: string) => {
        this.guardrail.validate(targetPath);
        return this.clone(url, targetPath);
    });

    this.registrar.handle('git.discard', async (repoPath: string, filePath: string) => {
        this.guardrail.validate(repoPath);
        return this.discard(repoPath, filePath);
    });

    this.registrar.handle('git.createBranch', async (repoPath: string, branchName: string) => {
        this.guardrail.validate(repoPath);
        return this.createBranch(repoPath, branchName);
    });

    this.registrar.handle('git.deleteBranch', async (repoPath: string, branchName: string) => {
        this.guardrail.validate(repoPath);
        return this.deleteBranch(repoPath, branchName);
    });

    this.registrar.handle('git.setConfig', async (repoPath: string, key: string, value: string) => {
        this.guardrail.validate(repoPath);
        const git = this.getGit(repoPath);
        await git.addConfig(key, value, false, 'local');
    });

    this.registrar.handle('git.unstage', async (repoPath: string, files: string[]) => {
        this.guardrail.validate(repoPath);
        return this.unstage(repoPath, files);
    });

    this.registrar.handle('git.discardBulk', async (repoPath: string, files: string[]) => {
        this.guardrail.validate(repoPath);
        return this.discardBulk(repoPath, files);
    });

    this.registrar.handle('git.removeRemote', async (repoPath: string, name: string) => {
        this.guardrail.validate(repoPath);
        return this.removeRemote(repoPath, name);
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
