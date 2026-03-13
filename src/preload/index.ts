import { contextBridge, ipcRenderer, shell } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { IPC_CHANNELS } from '../shared'

// Custom APIs for renderer
console.log('[Preload] Initializing Codex APIs v1.0.1');
const api = {
  fs: {
    readDirectory: (path: string) => ipcRenderer.invoke(IPC_CHANNELS.FS_READ_DIRECTORY, path),
    readFile: (path: string) => ipcRenderer.invoke(IPC_CHANNELS.FS_READ_FILE, path),
    readFileBinary: (path: string) => ipcRenderer.invoke(IPC_CHANNELS.FS_READ_FILE_BINARY, path),
    writeFile: (path: string, content: string) => ipcRenderer.invoke(IPC_CHANNELS.FS_WRITE_FILE, path, content),
    writeAsset: (path: string, content: Uint8Array) => ipcRenderer.invoke(IPC_CHANNELS.FS_WRITE_ASSET, path, content),
    createDirectory: (path: string) => ipcRenderer.invoke(IPC_CHANNELS.FS_CREATE_DIRECTORY, path),
    scaffoldWorkspace: (targetPath: string, workspaceName: string, cloneUrl: string) => ipcRenderer.invoke(IPC_CHANNELS.FS_SCAFFOLD_WORKSPACE, targetPath, workspaceName, cloneUrl),
    deleteFile: (path: string) => ipcRenderer.invoke(IPC_CHANNELS.FS_DELETE_FILE, path),
    exists: (path: string) => ipcRenderer.invoke(IPC_CHANNELS.FS_EXISTS, path),
    stat: (path: string) => ipcRenderer.invoke(IPC_CHANNELS.FS_STAT, path),
    getDocumentsPath: () => ipcRenderer.invoke(IPC_CHANNELS.APP_GET_DOCUMENTS_PATH),
    watchPath: (path: string | null) => ipcRenderer.invoke(IPC_CHANNELS.FS_WATCH_PATH, path),
    onFileChanged: (callback: (data: { type: 'add' | 'change' | 'unlink', path: string }) => void) => {
        const listener = (_: any, data: any) => callback(data);
        ipcRenderer.on(IPC_CHANNELS.FS_ON_FILE_CHANGED, listener);
        return () => ipcRenderer.removeListener(IPC_CHANNELS.FS_ON_FILE_CHANGED, listener);
    },
    rename: (oldPath: string, newPath: string) => ipcRenderer.invoke(IPC_CHANNELS.FS_RENAME, oldPath, newPath),
    allowPath: (path: string) => ipcRenderer.invoke(IPC_CHANNELS.FS_ALLOW_PATH, path)
  },
  app: {
    openExternal: (url: string) => shell.openExternal(url),
    onLog: (callback: (data: { severity: 'warning' | 'error', message: string }) => void) => {
        const listener = (_: any, data: any) => callback(data);
        ipcRenderer.on(IPC_CHANNELS.APP_ON_LOG, listener);
        return () => ipcRenderer.removeListener(IPC_CHANNELS.APP_ON_LOG, listener);
    },
    onDeepLink: (callback: (url: string) => void) => {
        const listener = (_: any, url: string) => callback(url);
        ipcRenderer.on(IPC_CHANNELS.APP_ON_DEEP_LINK, listener);
        return () => ipcRenderer.removeListener(IPC_CHANNELS.APP_ON_DEEP_LINK, listener);
    },
    getInitContext: () => ipcRenderer.invoke(IPC_CHANNELS.APP_GET_INIT_CONTEXT),
    getDownloadsPath: () => ipcRenderer.invoke(IPC_CHANNELS.APP_GET_DOWNLOADS_PATH),
    openWorkspace: (path: string) => ipcRenderer.invoke(IPC_CHANNELS.APP_OPEN_WORKSPACE, path),
    setActiveWorkspace: (path: string) => ipcRenderer.invoke(IPC_CHANNELS.APP_SET_ACTIVE_WORKSPACE, path),
    isMac: process.platform === 'darwin'
  },
  lsp: {
    start: (language: string) => ipcRenderer.invoke(IPC_CHANNELS.LSP_START, language),
    stop: (language: string) => ipcRenderer.invoke(IPC_CHANNELS.LSP_STOP, language),
    send: (payload: any) => ipcRenderer.invoke(IPC_CHANNELS.LSP_SEND, payload)
  },
  net: {
    fetch: (url: string, options?: any) => ipcRenderer.invoke(IPC_CHANNELS.NET_FETCH, url, options)
  },
  window: {
    minimize: () => ipcRenderer.send(IPC_CHANNELS.WINDOW_MINIMIZE),
    maximize: () => ipcRenderer.send(IPC_CHANNELS.WINDOW_MAXIMIZE),
    close: () => ipcRenderer.send(IPC_CHANNELS.WINDOW_CLOSE),
    setZoom: (factor: number) => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_SET_ZOOM, factor),
    getZoom: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_GET_ZOOM),
    onZoomChange: (callback: (factor: number) => void) => {
      const listener = (_: any, factor: number) => callback(factor);
      ipcRenderer.on(IPC_CHANNELS.WINDOW_ON_ZOOM_CHANGE, listener);
      return () => ipcRenderer.removeListener(IPC_CHANNELS.WINDOW_ON_ZOOM_CHANGE, listener);
    },
    setupWelcome: () => ipcRenderer.send(IPC_CHANNELS.WINDOW_SETUP_WELCOME),
    setupBuilder: () => ipcRenderer.send(IPC_CHANNELS.WINDOW_SETUP_BUILDER),
    setupMain: () => ipcRenderer.send(IPC_CHANNELS.WINDOW_SETUP_MAIN)
  },
  dialog: {
    openDirectory: () => ipcRenderer.invoke(IPC_CHANNELS.DIALOG_OPEN_DIRECTORY),
    openFile: () => ipcRenderer.invoke(IPC_CHANNELS.DIALOG_OPEN_FILE)
  },
  git: {
    status: (repoPath: string) => ipcRenderer.invoke(IPC_CHANNELS.GIT_STATUS, repoPath),
    init: (repoPath: string) => ipcRenderer.invoke(IPC_CHANNELS.GIT_INIT, repoPath),
    add: (repoPath: string, files: string[]) => ipcRenderer.invoke(IPC_CHANNELS.GIT_ADD, repoPath, files),
    commit: (repoPath: string, message: string) => ipcRenderer.invoke(IPC_CHANNELS.GIT_COMMIT, repoPath, message),
    push: (repoPath: string, remote?: string, branch?: string) => ipcRenderer.invoke(IPC_CHANNELS.GIT_PUSH, repoPath, remote, branch),
    pull: (repoPath: string, remote?: string, branch?: string) => ipcRenderer.invoke(IPC_CHANNELS.GIT_PULL, repoPath, remote, branch),
    history: (repoPath: string) => ipcRenderer.invoke(IPC_CHANNELS.GIT_HISTORY, repoPath),
    checkIsRepo: (repoPath: string) => ipcRenderer.invoke(IPC_CHANNELS.GIT_CHECK_IS_REPO, repoPath),
    getBranches: (repoPath: string) => ipcRenderer.invoke(IPC_CHANNELS.GIT_GET_BRANCHES, repoPath),
    checkout: (repoPath: string, branch: string) => ipcRenderer.invoke(IPC_CHANNELS.GIT_CHECKOUT, repoPath, branch),
    clone: (url: string, targetPath: string) => ipcRenderer.invoke(IPC_CHANNELS.GIT_CLONE, url, targetPath),
    discard: (repoPath: string, filePath: string) => ipcRenderer.invoke(IPC_CHANNELS.GIT_DISCARD, repoPath, filePath),
    createBranch: (repoPath: string, branchName: string) => ipcRenderer.invoke(IPC_CHANNELS.GIT_CREATE_BRANCH, repoPath, branchName),
    deleteBranch: (repoPath: string, branchName: string) => ipcRenderer.invoke(IPC_CHANNELS.GIT_DELETE_BRANCH, repoPath, branchName),
    addRemote: (repoPath: string, name: string, url: string) => ipcRenderer.invoke(IPC_CHANNELS.GIT_ADD_REMOTE, repoPath, name, url),
    setConfig: (repoPath: string, key: string, value: string) => ipcRenderer.invoke(IPC_CHANNELS.GIT_SET_CONFIG, repoPath, key, value),
    removeRemote: (repoPath: string, name: string) => ipcRenderer.invoke(IPC_CHANNELS.GIT_REMOVE_REMOTE, repoPath, name),
    unstage: (repoPath: string, files: string[]) => ipcRenderer.invoke(IPC_CHANNELS.GIT_UNSTAGE, repoPath, files),
    discardBulk: (repoPath: string, files: string[]) => ipcRenderer.invoke(IPC_CHANNELS.GIT_DISCARD_BULK, repoPath, files),
    getRemotes: (repoPath: string) => ipcRenderer.invoke(IPC_CHANNELS.GIT_GET_REMOTES, repoPath),
    show: (repoPath: string, args: string) => ipcRenderer.invoke(IPC_CHANNELS.GIT_SHOW, repoPath, args)
  },
  github: {
    createRepository: (token: string, name: string, description: string, isPrivate: boolean) => 
      ipcRenderer.invoke(IPC_CHANNELS.GITHUB_CREATE_REPOSITORY, token, name, description, isPrivate),
    startDeviceFlow: () => ipcRenderer.invoke(IPC_CHANNELS.GITHUB_START_DEVICE_FLOW),
    pollDeviceToken: (deviceCode: string) => ipcRenderer.invoke(IPC_CHANNELS.GITHUB_POLL_DEVICE_TOKEN, deviceCode),
    getUser: (token: string) => ipcRenderer.invoke(IPC_CHANNELS.GITHUB_GET_USER, token),
    listRepos: (token: string) => ipcRenderer.invoke(IPC_CHANNELS.GITHUB_LIST_REPOS, token),
    forkRepository: (token: string, owner: string, repo: string) => ipcRenderer.invoke(IPC_CHANNELS.GITHUB_FORK_REPOSITORY, token, owner, repo)
  },
  secrets: {
    get: (key: string) => ipcRenderer.invoke(IPC_CHANNELS.SECRETS_GET, key),
    set: (key: string, value: string) => ipcRenderer.invoke(IPC_CHANNELS.SECRETS_SET, key, value),
    delete: (key: string) => ipcRenderer.invoke(IPC_CHANNELS.SECRETS_DELETE, key)
  },
  appSettings: {
    getSettings: () => ipcRenderer.invoke(IPC_CHANNELS.APP_GET_SETTINGS),
    updateSetting: (key: string, value: any) => ipcRenderer.invoke(IPC_CHANNELS.APP_UPDATE_SETTING, key, value),
    updateSettings: (settings: any) => ipcRenderer.invoke(IPC_CHANNELS.APP_UPDATE_SETTINGS, settings)
  },
  ai: {
    isAvailable: () => ipcRenderer.invoke(IPC_CHANNELS.AI_IS_AVAILABLE),
    chat: (messages: any[], options?: any) => ipcRenderer.invoke(IPC_CHANNELS.AI_CHAT, messages, options),
    chatStream: (messages: any[], options?: any) => ipcRenderer.invoke(IPC_CHANNELS.AI_STREAM, messages, options),
    analyzeIntent: (query: string, entryTypes?: any) => ipcRenderer.invoke(IPC_CHANNELS.AI_ANALYZE_INTENT, query, entryTypes),
    indexEntry: (entry: any, config?: any) => ipcRenderer.invoke(IPC_CHANNELS.AI_INDEX_ENTRY, entry, config),
    search: (query: string, limit?: number) => ipcRenderer.invoke(IPC_CHANNELS.AI_SEARCH, query, limit),
    getContext: (entryId: string, query: string, maxChunks?: number) => ipcRenderer.invoke(IPC_CHANNELS.AI_GET_CONTEXT, entryId, query, maxChunks),
    deleteEntryIndex: (entryId: string) => ipcRenderer.invoke(IPC_CHANNELS.AI_DELETE_ENTRY_INDEX, entryId),
    getHardwareSpecs: () => ipcRenderer.invoke(IPC_CHANNELS.AI_GET_HARDWARE_SPECS),
    scoreModel: (model: any, specs: any) => ipcRenderer.invoke(IPC_CHANNELS.AI_SCORE_MODEL, model, specs),
    pullModel: (model: string) => ipcRenderer.invoke(IPC_CHANNELS.AI_PULL_MODEL, model),
    onPullProgress: (callback: (data: any) => void) => {
      const listener = (_: any, data: any) => callback(data);
      ipcRenderer.on(IPC_CHANNELS.AI_PULL_PROGRESS, listener);
      return () => ipcRenderer.removeListener(IPC_CHANNELS.AI_PULL_PROGRESS, listener);
    },
    getModels: () => ipcRenderer.invoke(IPC_CHANNELS.AI_GET_MODELS),
    abortChat: () => ipcRenderer.invoke(IPC_CHANNELS.AI_ABORT_CHAT),
    onChatUpdate: (callback: (chunk: string) => void) => {
        const listener = (_: any, chunk: string) => callback(chunk);
        ipcRenderer.on(IPC_CHANNELS.AI_CHAT_CHUNK, listener);
        return () => ipcRenderer.removeListener(IPC_CHANNELS.AI_CHAT_CHUNK, listener);
    },
    onChatEnd: (callback: () => void) => {
        const listener = () => callback();
        ipcRenderer.on(IPC_CHANNELS.AI_CHAT_END, listener);
        return () => ipcRenderer.removeListener(IPC_CHANNELS.AI_CHAT_END, listener);
    }
  },
  system: {
    getProcessStats: (processNames: string[]) => ipcRenderer.invoke(IPC_CHANNELS.SYSTEM_GET_PROCESS_STATS, processNames),
    startService: (name: string) => ipcRenderer.invoke(IPC_CHANNELS.SYSTEM_START_SERVICE, name),
    stopService: (name: string) => ipcRenderer.invoke(IPC_CHANNELS.SYSTEM_STOP_SERVICE, name),
    deployStack: (service?: string) => ipcRenderer.invoke(IPC_CHANNELS.SYSTEM_DEPLOY_STACK, service),
    openDevTools: () => ipcRenderer.send(IPC_CHANNELS.SYSTEM_OPEN_DEV_TOOLS),
    triggerDebugError: (severity: 'warning' | 'error') => ipcRenderer.invoke(IPC_CHANNELS.DEBUG_TRIGGER_ERROR, severity)
  },
  latex: {
    check: () => ipcRenderer.invoke(IPC_CHANNELS.LATEX_CHECK),
    compile: (files: { name: string, content: string }[]) => ipcRenderer.invoke(IPC_CHANNELS.LATEX_COMPILE, { files })
  },
  service: {
    start: (service: 'execution' | 'tts') => ipcRenderer.invoke(IPC_CHANNELS.SERVICE_START, service),
    stop: (service: 'execution' | 'tts') => ipcRenderer.invoke(IPC_CHANNELS.SERVICE_STOP, service),
    status: (service: 'execution' | 'tts') => ipcRenderer.invoke(IPC_CHANNELS.SERVICE_STATUS, service)
  },
  repl: {
    startSession: (lang: string) => ipcRenderer.invoke(IPC_CHANNELS.REPL_START_SESSION, lang),
    sendInput: (sessionId: string, data: string) => ipcRenderer.send(IPC_CHANNELS.REPL_SEND_INPUT, sessionId, data),
    stopSession: (sessionId: string) => ipcRenderer.invoke(IPC_CHANNELS.REPL_STOP_SESSION, sessionId),
    listContainers: () => ipcRenderer.invoke(IPC_CHANNELS.REPL_LIST_CONTAINERS),
    stopContainer: (containerId: string) => ipcRenderer.invoke(IPC_CHANNELS.REPL_STOP_CONTAINER, containerId),
    removeContainer: (containerId: string) => ipcRenderer.invoke(IPC_CHANNELS.REPL_REMOVE_CONTAINER, containerId),
    checkSession: (sessionId: string) => ipcRenderer.invoke(IPC_CHANNELS.REPL_CHECK_SESSION, sessionId),
    onOutput: (callback: (data: { sessionId: string, data: string }) => void) => {
        const listener = (_: any, data: any) => callback(data);
        ipcRenderer.on(IPC_CHANNELS.REPL_ON_OUTPUT, listener);
        return () => ipcRenderer.removeListener(IPC_CHANNELS.REPL_ON_OUTPUT, listener);
    },
    onClosed: (callback: (data: { sessionId: string, code: number }) => void) => {
        const listener = (_: any, data: any) => callback(data);
        ipcRenderer.on(IPC_CHANNELS.REPL_ON_CLOSED, listener);
        return () => ipcRenderer.removeListener(IPC_CHANNELS.REPL_ON_CLOSED, listener);
    }
  },
  db: {
    initWorkspace: (path: string) => ipcRenderer.invoke(IPC_CHANNELS.DB_INIT_WORKSPACE, path),
    getFeedItems: (feedId: string, limit?: number) => ipcRenderer.invoke(IPC_CHANNELS.DB_GET_FEED_ITEMS, feedId, limit),
    saveFeedItems: (feedId: string, items: any[]) => ipcRenderer.invoke(IPC_CHANNELS.DB_SAVE_FEED_ITEMS, feedId, items),
    getFeedStatus: () => ipcRenderer.invoke(IPC_CHANNELS.DB_GET_FEED_STATUS),
    updateFeedStatus: (itemId: string, status: any) => ipcRenderer.invoke(IPC_CHANNELS.DB_UPDATE_FEED_STATUS, itemId, status)
  },
  models: {
    checkStatus: () => ipcRenderer.invoke('models:check-status'),
    download: () => ipcRenderer.invoke('models:download'),
    onDownloadProgress: (callback: (progress: any) => void) => {
      const listener = (_: any, progress: any) => callback(progress);
      ipcRenderer.on('models:download-progress', listener);
      return () => ipcRenderer.removeListener('models:download-progress', listener);
    }
  },
  on: (channel: string, callback: (...args: any[]) => void) => {
    const listener = (_: any, ...args: any[]) => callback(...args);
    ipcRenderer.on(channel, listener);
    return () => ipcRenderer.removeListener(channel, listener);
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
