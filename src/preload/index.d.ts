import { ElectronAPI } from '@electron-toolkit/preload'

export interface CustomAPI {
  app: {
    openExternal: (url: string) => Promise<void>
    onLog: (callback: (data: { severity: 'warning' | 'error', message: string }) => void) => () => void;
    onDeepLink: (callback: (url: string) => void) => () => void;
    getInitContext: () => Promise<{ workspacePath: string | null, appVersion: string, platform: string, deepLinkUrl?: string | null, lspPort: number, ttsPort: number, qdrantPort: number }>;
    getDownloadsPath: () => Promise<string>;
    openWorkspace: (path: string) => Promise<void>;
    setActiveWorkspace: (path: string) => Promise<boolean>;
    isMac: boolean;
  }
  net: {
    fetch: (url: string, options?: any) => Promise<any>
  }
  window: {
    minimize: () => void
    maximize: () => void
    close: () => void
    setZoom: (factor: number) => Promise<number>;
    getZoom: () => Promise<number>;
    onZoomChange: (callback: (factor: number) => void) => () => void;
    setupWelcome: () => void;
    setupBuilder: () => void;
    setupMain: () => void;
  }
  dialog: {
    openDirectory: () => Promise<string | null>
    openFile: () => Promise<string | null>
  }
  system: {
    openDevTools: () => void
  }
  on: (channel: string, callback: (...args: any[]) => void) => () => void;
  module: {
    invoke: (moduleId: string, method: string, ...args: any[]) => Promise<any>
  }
}

declare global {
  interface Window {
    electron: ElectronAPI
    claimCitadelApi: () => CustomAPI | undefined
  }
}
