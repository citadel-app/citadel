import { ElectronAPI } from '@electron-toolkit/preload'

export interface CustomAPI {
  fs: {
    readDirectory: (path: string) => Promise<string[]>
    readFile: (path: string) => Promise<string>
    readFileBinary: (path: string) => Promise<Uint8Array>
    writeFile: (path: string, content: string) => Promise<void>
    writeAsset: (path: string, content: Uint8Array) => Promise<void>
    createDirectory: (path: string) => Promise<void>
    scaffoldWorkspace: (targetPath: string, workspaceName: string, cloneUrl: string) => Promise<boolean>
    deleteFile: (path: string) => Promise<void>
    exists: (path: string) => Promise<boolean>
    getDocumentsPath: () => Promise<string>
    watchPath: (path: string | null) => Promise<void>
    onFileChanged: (callback: (data: { type: 'add' | 'change' | 'unlink', path: string }) => void) => () => void
    rename: (oldPath: string, newPath: string) => Promise<void>
    allowPath: (path: string) => Promise<void>
  }
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
  lsp: {
    start: (language: string) => Promise<any>
    stop: (language: string) => Promise<any>
    send: (payload: any) => Promise<any>
  }
  net: {
    fetch: (url: string, options?: any) => Promise<any>
  }
  git: {
    status: (repoPath: string) => Promise<any>
    init: (repoPath: string) => Promise<void>
    add: (repoPath: string, files: string[]) => Promise<void>
    commit: (repoPath: string, message: string) => Promise<void>
    push: (repoPath: string, remote?: string, branch?: string) => Promise<void>
    pull: (repoPath: string, remote?: string, branch?: string) => Promise<void>
    history: (repoPath: string) => Promise<any>
    checkIsRepo: (repoPath: string) => Promise<boolean>
    getBranches: (repoPath: string) => Promise<{ all: string[], current: string }>
    checkout: (repoPath: string, branch: string) => Promise<void>
    createBranch: (repoPath: string, branchName: string) => Promise<void>
    deleteBranch: (repoPath: string, branchName: string) => Promise<void>
    clone: (url: string, targetPath: string) => Promise<void>
    discard: (repoPath: string, filePath: string) => Promise<void>
    addRemote: (repoPath: string, name: string, url: string) => Promise<void>
    setConfig: (repoPath: string, key: string, value: string) => Promise<void>
    removeRemote: (repoPath: string, name: string) => Promise<void>
    getRemotes: (repoPath: string) => Promise<any[]>
    show: (repoPath: string, args: string) => Promise<string>
    unstage: (repoPath: string, files: string[]) => Promise<void>
    discardBulk: (repoPath: string, files: string[]) => Promise<void>
  }
  github: {
    createRepository: (token: string, name: string, description: string, isPrivate: boolean) => Promise<any>
    forkRepository: (token: string, owner: string, repo: string) => Promise<any>
    startDeviceFlow: () => Promise<{ device_code: string; user_code: string; verification_uri: string; expires_in: number; interval: number }>
    pollDeviceToken: (deviceCode: string) => Promise<{ status: 'pending' | 'success' | 'expired' | 'error'; access_token?: string; error?: string }>
    getUser: (token: string) => Promise<{ login: string; name: string | null; avatar_url: string; email: string | null }>
    listRepos: (token: string) => Promise<Array<{
      name: string; full_name: string; html_url: string;
      clone_url: string; description: string; private: boolean;
      updated_at: string; topics: string[];
    }>>
  }
  secrets: {
    get: (key: string) => Promise<string | null>
    set: (key: string, value: string) => Promise<void>
    delete: (key: string) => Promise<void>
  }
  window: {
    minimize: () => Promise<void>
    maximize: () => Promise<void>
    close: () => Promise<void>
    setZoom: (factor: number) => Promise<number>;
    getZoom: () => Promise<number>;
    setupWelcome: () => void;
    setupBuilder: () => void;
    setupMain: () => void;
  }
  dialog: {
    openDirectory: () => Promise<string | null>
    openFile: () => Promise<string | null>
  }
  appSettings: {
    getSettings: () => Promise<any>
    updateSetting: (key: string, value: any) => Promise<any>
    updateSettings: (settings: any) => Promise<any>
  }
  ai: {
    pullModel: (baseUrl: string, model: string) => Promise<any>
    onPullProgress: (callback: (data: { status: string; completed?: number; total?: number; digest?: string }) => void) => () => void
    getHardwareSpecs: () => Promise<{
      totalMemory: number;
      gpus: { model: string; vram: number }[];
      cpu: { flags: string; cores: number };
      storage: number;
    } | null>,
    chatStream: (baseUrl: string, payload: any) => Promise<any>,
    cloudChatStream: (config: {
      provider: 'openai' | 'gemini' | 'azure-foundry',
      baseUrl: string,
      apiKey: string,
      model: string,
      prompt: string,
      system?: string,
      temperature?: number
    }) => Promise<any>,
    abortChat: () => Promise<boolean>,
    onChatUpdate: (callback: (chunk: string) => void) => () => void
  }
  system: {
    getProcessStats: (processNames: string[]) => Promise<Record<string, { cpu: number; memory: number; memoryMB: number } | null>>,
    startService: (name: string) => Promise<boolean>,
    stopService: (name: string) => Promise<boolean>,
    deployStack: (service?: string) => Promise<{ success: boolean; output?: string; error?: string }>,
    openDevTools: () => void
  }
  latex: {
    check: () => Promise<boolean>
    compile: (files: { name: string, content: string }[]) => Promise<{ success: boolean, pdf?: string, logs?: string }>
  }
  service: {
    start: (service: 'execution' | 'tts') => Promise<boolean>
    stop: (service: 'execution' | 'tts') => Promise<boolean>
    status: (service: 'execution' | 'tts') => Promise<{ name: string; status: 'running' | 'stopped' | 'error'; pid?: number }>
  }
  repl: {
    startSession: (lang: string) => Promise<string>
    sendInput: (sessionId: string, data: string) => void
    stopSession: (sessionId: string) => Promise<void>
    listContainers: () => Promise<any[]>
    stopContainer: (containerId: string) => Promise<void>
    removeContainer: (containerId: string) => Promise<void>
    onOutput: (callback: (data: { sessionId: string, data: string }) => void) => () => void
    onClosed: (callback: (data: { sessionId: string, code: number }) => void) => () => void
  }
  db: {
    initWorkspace: (path: string) => Promise<boolean>
    getFeedItems: (feedId: string, limit?: number) => Promise<any[]>
    saveFeedItems: (feedId: string, items: any[]) => Promise<void>
    getFeedStatus: () => Promise<Record<string, { read: boolean, relatedEntries: any[] }>>
    updateFeedStatus: (itemId: string, status: { read?: boolean, relatedEntries?: any[] }) => Promise<void>
  }
  on: (channel: string, callback: (...args: any[]) => void) => () => void
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: CustomAPI
  }
}
