import { ipcMain, net } from 'electron';

export class GitHubService {
  constructor() {
    console.log('[GitHubService] Initializing...');
    this.registerIpcHandlers();
  }

  private registerIpcHandlers() {
    ipcMain.handle('github:create-repository', async (_, token: string, name: string, description: string, isPrivate: boolean) => {
      return this.createRepository(token, name, description, isPrivate);
    });
    ipcMain.handle('github:list-repos', async (_, token: string) => {
      return this.listRepos(token);
    });
    ipcMain.handle('github:fork-repository', async (_, token: string, owner: string, repo: string) => {
      return this.forkRepository(token, owner, repo);
    });
  }

  async listRepos(token: string) {
    console.log('[GitHubService] Listing user repositories...');
    try {
      const response = await net.fetch('https://api.github.com/user/repos?sort=updated&per_page=50&type=all', {
        method: 'GET',
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Citadel-App'
        }
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('[GitHubService] GitHub API Error:', data);
        throw new Error(data.message || 'Failed to list repositories');
      }

      const repos = (data as any[]).map((repo: any) => ({
        name: repo.name,
        full_name: repo.full_name,
        html_url: repo.html_url,
        clone_url: repo.clone_url,
        description: repo.description || '',
        private: repo.private,
        updated_at: repo.updated_at,
        topics: repo.topics || []
      }));

      // Sort: repos with citadel-workspace topic come first
      repos.sort((a, b) => {
        const aHasCitadel = a.topics.includes('citadel-workspace');
        const bHasCitadel = b.topics.includes('citadel-workspace');
        if (aHasCitadel && !bHasCitadel) return -1;
        if (!aHasCitadel && bHasCitadel) return 1;
        return 0;
      });

      console.log(`[GitHubService] Found ${repos.length} repositories`);
      return repos;
    } catch (e: any) {
      console.error('[GitHubService] listRepos failed:', e);
      throw e;
    }
  }

  async createRepository(token: string, name: string, description: string, isPrivate: boolean) {
    console.log(`[GitHubService] Creating repository: ${name} (private: ${isPrivate})`);
    
    try {
      const response = await net.fetch('https://api.github.com/user/repos', {
        method: 'POST',
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
          'User-Agent': 'Citadel-App'
        },
        body: JSON.stringify({
          name,
          description,
          private: isPrivate,
          auto_init: false // We initialize locally and push
        })
      });

      const data = await response.json();

      if (!response.ok) {
      console.error('[GitHubService] GitHub API Error:', data);
      throw new Error(data.message || 'Failed to create repository on GitHub');
    }

    // Add topics
    try {
      await net.fetch(`https://api.github.com/repos/${data.full_name}/topics`, {
        method: 'PUT',
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.mercy-preview+json',
          'Content-Type': 'application/json',
          'User-Agent': 'Citadel-App'
        },
        body: JSON.stringify({
          names: ['citadel-workspace', 'codex-workspace']
        })
      });
    } catch (err) {
      console.warn('[GitHubService] Failed to set topics:', err);
    }

    console.log(`[GitHubService] Repository created successfully: ${data.html_url}`);
      return {
        id: data.id,
        name: data.name,
        full_name: data.full_name,
        html_url: data.html_url,
        clone_url: data.clone_url,
        ssh_url: data.ssh_url
      };
    } catch (e: any) {
      console.error('[GitHubService] Request failed:', e);
      throw e;
    }
  }

  async forkRepository(token: string, owner: string, repo: string) {
    console.log(`[GitHubService] Forking repository: ${owner}/${repo}`);
    try {
      const response = await net.fetch(`https://api.github.com/repos/${owner}/${repo}/forks`, {
        method: 'POST',
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Citadel-App'
        }
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('[GitHubService] GitHub API Error:', data);
        throw new Error(data.message || 'Failed to fork repository on GitHub');
      }

      console.log(`[GitHubService] Repository forked successfully: ${data.html_url}`);
      // Wait a moment for GitHub to prepare the clone URL
      await new Promise(r => setTimeout(r, 2000));
      return {
        id: data.id,
        name: data.name,
        full_name: data.full_name,
        html_url: data.html_url,
        clone_url: data.clone_url,
        ssh_url: data.ssh_url
      };
    } catch (e: any) {
      console.error('[GitHubService] Request failed:', e);
      throw e;
    }
  }
}
