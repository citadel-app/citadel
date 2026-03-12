import { ipcMain, net } from 'electron';
import { IPC_CHANNELS } from '@shared';

/**
 * GitHub App Device Flow Authentication Service
 * 
 * Uses the OAuth Device Flow to authenticate users with a GitHub App.
 * Only requires the Client ID (no secret needed for device flow).
 * Permissions are fine-grained, set at the GitHub App level.
 * 
 * Flow:
 * 1. App requests device + user codes from GitHub
 * 2. User enters code at github.com/login/device in their browser
 * 3. App polls GitHub until authorization is complete
 * 4. App receives a user access token with fine-grained permissions
 */

// ============================================================
// ⚠️  REPLACE THIS with your GitHub App's Client ID
//     Found at: github.com/settings/apps/<your-app> → Client ID
// ============================================================
const GITHUB_APP_CLIENT_ID = process.env.MAIN_VITE_GITHUB_CLIENT_ID || 'Ov23lieuVtPiNTMTYJ4v';

interface DeviceFlowResponse {
  device_code: string;
  user_code: string;
  verification_uri: string;
  expires_in: number;
  interval: number;
}

interface PollResult {
  status: 'pending' | 'success' | 'expired' | 'error';
  access_token?: string;
  error?: string;
}

interface GitHubUser {
  login: string;
  name: string | null;
  avatar_url: string;
  email: string | null;
}

export class GitHubAuthService {
  constructor() {
    console.log('[GitHubAuthService] Initializing...');
    this.registerIpcHandlers();
  }

  private registerIpcHandlers() {
    ipcMain.handle(IPC_CHANNELS.GITHUB_START_DEVICE_FLOW, async () => {
      return this.startDeviceFlow();
    });

    ipcMain.handle(IPC_CHANNELS.GITHUB_POLL_DEVICE_TOKEN, async (_, deviceCode: string) => {
      return this.pollForToken(deviceCode);
    });

    ipcMain.handle(IPC_CHANNELS.GITHUB_GET_USER, async (_, token: string) => {
      return this.getUser(token);
    });
  }

  /**
   * Step 1: Request device and user verification codes from GitHub.
   * The user_code is what the user enters at the verification_uri.
   */
  async startDeviceFlow(): Promise<DeviceFlowResponse> {
    console.log('[GitHubAuthService] Starting device flow...');

    try {
      const response = await net.fetch('https://github.com/login/device/code', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          client_id: GITHUB_APP_CLIENT_ID,
          scope: 'repo'
        })
      });

      const data = await response.json() as any;

      if (!response.ok) {
        console.error('[GitHubAuthService] Device code request failed:', data);
        throw new Error(data.error_description || data.error || 'Failed to start device flow');
      }

      console.log('[GitHubAuthService] Device flow started. User code:', data.user_code);
      return {
        device_code: data.device_code,
        user_code: data.user_code,
        verification_uri: data.verification_uri,
        expires_in: data.expires_in,
        interval: data.interval
      };
    } catch (e: any) {
      console.error('[GitHubAuthService] startDeviceFlow error:', e);
      throw e;
    }
  }

  /**
   * Step 3: Poll GitHub to check if the user has authorized the device.
   * Should be called at the interval specified in Step 1.
   */
  async pollForToken(deviceCode: string): Promise<PollResult> {
    try {
      const response = await net.fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          client_id: GITHUB_APP_CLIENT_ID,
          device_code: deviceCode,
          grant_type: 'urn:ietf:params:oauth:grant-type:device_code'
        })
      });

      const data = await response.json() as any;

      // Success — we got a token
      if (data.access_token) {
        console.log('[GitHubAuthService] Authorization successful!');
        return {
          status: 'success',
          access_token: data.access_token
        };
      }

      // Handle known polling states
      switch (data.error) {
        case 'authorization_pending':
          return { status: 'pending' };
        
        case 'slow_down':
          // Caller should increase interval by 5 seconds
          return { status: 'pending', error: 'slow_down' };
        
        case 'expired_token':
          console.log('[GitHubAuthService] Device code expired.');
          return { status: 'expired' };
        
        case 'access_denied':
          console.log('[GitHubAuthService] User denied access.');
          return { status: 'error', error: 'Access denied by user.' };
        
        default:
          console.error('[GitHubAuthService] Unexpected poll response:', data);
          return { status: 'error', error: data.error_description || data.error || 'Unknown error' };
      }
    } catch (e: any) {
      console.error('[GitHubAuthService] pollForToken error:', e);
      return { status: 'error', error: e.message || 'Network error' };
    }
  }

  /**
   * Fetch the authenticated user's profile info.
   */
  async getUser(token: string): Promise<GitHubUser> {
    console.log('[GitHubAuthService] Fetching user info...');

    try {
      const response = await net.fetch('https://api.github.com/user', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Citadel-App'
        }
      });

      const data = await response.json() as any;

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch user info');
      }

      console.log(`[GitHubAuthService] Authenticated as: ${data.login}`);
      return {
        login: data.login,
        name: data.name,
        avatar_url: data.avatar_url,
        email: data.email
      };
    } catch (e: any) {
      console.error('[GitHubAuthService] getUser error:', e);
      throw e;
    }
  }
}
