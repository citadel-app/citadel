import { contextBridge, ipcRenderer, shell } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
console.log('[Preload] Initializing Codex APIs v1.0.1');
const api = {
  fs: {
    readDirectory: (path: string) => ipcRenderer.invoke('fs:readDirectory', path),
    readFile: (path: string) => ipcRenderer.invoke('fs:readFile', path),
    readFileBinary: (path: string) => ipcRenderer.invoke('fs:readFileBinary', path),
    writeFile: (path: string, content: string) => ipcRenderer.invoke('fs:writeFile', path, content),
    writeAsset: (path: string, content: Uint8Array) => ipcRenderer.invoke('fs:writeAsset', path, content),
    createDirectory: (path: string) => ipcRenderer.invoke('fs:createDirectory', path),
    scaffoldWorkspace: (targetPath: string, workspaceName: string, cloneUrl: string) => ipcRenderer.invoke('fs:scaffoldWorkspace', targetPath, workspaceName, cloneUrl),
    deleteFile: (path: string) => ipcRenderer.invoke('fs:deleteFile', path),
    exists: (path: string) => ipcRenderer.invoke('fs:exists', path),
    getDocumentsPath: () => ipcRenderer.invoke('app:getDocumentsPath'),
    watchPath: (path: string | null) => ipcRenderer.invoke('fs:watch-path', path),
    onFileChanged: (callback: (data: { type: 'add' | 'change' | 'unlink', path: string }) => void) => {
        const listener = (_: any, data: any) => callback(data);
        ipcRenderer.on('fs:file-changed', listener);
        return () => ipcRenderer.removeListener('fs:file-changed', listener);
    },
    rename: (oldPath: string, newPath: string) => ipcRenderer.invoke('fs:rename', oldPath, newPath),
    allowPath: (path: string) => ipcRenderer.invoke('fs:allowPath', path)
  },
  app: {
    openExternal: (url: string) => shell.openExternal(url),
    onLog: (callback: (data: { severity: 'warning' | 'error', message: string }) => void) => {
        const listener = (_: any, data: any) => callback(data);
        ipcRenderer.on('app:onLog', listener);
        return () => ipcRenderer.removeListener('app:onLog', listener);
    },
    onDeepLink: (callback: (url: string) => void) => {
        const listener = (_: any, url: string) => callback(url);
        ipcRenderer.on('app:onDeepLink', listener);
        return () => ipcRenderer.removeListener('app:onDeepLink', listener);
    },
    getInitContext: () => ipcRenderer.invoke('app:get-init-context'),
    openWorkspace: (path: string) => ipcRenderer.invoke('app:open-workspace', path),
    setActiveWorkspace: (path: string) => ipcRenderer.invoke('app:set-active-workspace', path)
  },
  lsp: {
    start: (language: string) => ipcRenderer.invoke('lsp:start', language),
    stop: (language: string) => ipcRenderer.invoke('lsp:stop', language),
    send: (payload: any) => ipcRenderer.invoke('lsp:send', payload)
  },
  net: {
    fetch: (url: string, options?: any) => ipcRenderer.invoke('net:fetch', url, options)
  },
  window: {
    minimize: () => ipcRenderer.send('window:minimize'),
    maximize: () => ipcRenderer.send('window:maximize'),
    close: () => ipcRenderer.send('window:close'),
    setZoom: (factor: number) => ipcRenderer.invoke('window:set-zoom', factor),
    getZoom: () => ipcRenderer.invoke('window:get-zoom'),
    setupWelcome: () => ipcRenderer.send('window:setup-welcome'),
    setupBuilder: () => ipcRenderer.send('window:setup-builder'),
    setupMain: () => ipcRenderer.send('window:setup-main')
  },
  dialog: {
    openDirectory: () => ipcRenderer.invoke('dialog:openDirectory'),
    openFile: () => ipcRenderer.invoke('dialog:openFile')
  },
  git: {
    status: (repoPath: string) => ipcRenderer.invoke('git:status', repoPath),
    init: (repoPath: string) => ipcRenderer.invoke('git:init', repoPath),
    add: (repoPath: string, files: string[]) => ipcRenderer.invoke('git:add', repoPath, files),
    commit: (repoPath: string, message: string) => ipcRenderer.invoke('git:commit', repoPath, message),
    push: (repoPath: string, remote?: string, branch?: string) => ipcRenderer.invoke('git:push', repoPath, remote, branch),
    pull: (repoPath: string, remote?: string, branch?: string) => ipcRenderer.invoke('git:pull', repoPath, remote, branch),
    history: (repoPath: string) => ipcRenderer.invoke('git:history', repoPath),
    checkIsRepo: (repoPath: string) => ipcRenderer.invoke('git:check-is-repo', repoPath),
    getBranches: (repoPath: string) => ipcRenderer.invoke('git:get-branches', repoPath),
    checkout: (repoPath: string, branch: string) => ipcRenderer.invoke('git:checkout', repoPath, branch),
    clone: (url: string, targetPath: string) => ipcRenderer.invoke('git:clone', url, targetPath),
    discard: (repoPath: string, filePath: string) => ipcRenderer.invoke('git:discard', repoPath, filePath),
    createBranch: (repoPath: string, branchName: string) => ipcRenderer.invoke('git:create-branch', repoPath, branchName),
    deleteBranch: (repoPath: string, branchName: string) => ipcRenderer.invoke('git:delete-branch', repoPath, branchName),
    addRemote: (repoPath: string, name: string, url: string) => ipcRenderer.invoke('git:add-remote', repoPath, name, url),
    setConfig: (repoPath: string, key: string, value: string) => ipcRenderer.invoke('git:setConfig', repoPath, key, value),
    removeRemote: (repoPath: string, name: string) => ipcRenderer.invoke('git:remove-remote', repoPath, name),
    unstage: (repoPath: string, files: string[]) => ipcRenderer.invoke('git:unstage', repoPath, files),
    discardBulk: (repoPath: string, files: string[]) => ipcRenderer.invoke('git:discard-bulk', repoPath, files),
    getRemotes: (repoPath: string) => ipcRenderer.invoke('git:get-remotes', repoPath),
    show: (repoPath: string, args: string) => ipcRenderer.invoke('git:show', repoPath, args)
  },
  github: {
    createRepository: (token: string, name: string, description: string, isPrivate: boolean) => 
      ipcRenderer.invoke('github:create-repository', token, name, description, isPrivate),
    startDeviceFlow: () => ipcRenderer.invoke('github:start-device-flow'),
    pollDeviceToken: (deviceCode: string) => ipcRenderer.invoke('github:poll-device-token', deviceCode),
    getUser: (token: string) => ipcRenderer.invoke('github:get-user', token),
    listRepos: (token: string) => ipcRenderer.invoke('github:list-repos', token),
    forkRepository: (token: string, owner: string, repo: string) => ipcRenderer.invoke('github:fork-repository', token, owner, repo)
  },
  secrets: {
    get: (key: string) => ipcRenderer.invoke('secrets:get', key),
    set: (key: string, value: string) => ipcRenderer.invoke('secrets:set', key, value),
    delete: (key: string) => ipcRenderer.invoke('secrets:delete', key)
  },
  appSettings: {
    getSettings: () => ipcRenderer.invoke('app:get-settings'),
    updateSetting: (key: string, value: any) => ipcRenderer.invoke('app:update-setting', key, value),
    updateSettings: (settings: any) => ipcRenderer.invoke('app:update-settings', settings)
  },
  ai: {
    pullModel: (baseUrl: string, model: string) => ipcRenderer.invoke('ai:pullModel', baseUrl, model),
    onPullProgress: (callback: (data: any) => void) => {
        const listener = (_: any, data: any) => callback(data);
        ipcRenderer.on('ai:pullProgress', listener);
        return () => ipcRenderer.removeListener('ai:pullProgress', listener);
    },
    getHardwareSpecs: () => ipcRenderer.invoke('ai:getHardwareSpecs'),
    chatStream: (baseUrl: string, payload: any) => ipcRenderer.invoke('ai:chatStream', baseUrl, payload),
    cloudChatStream: (config: any) => ipcRenderer.invoke('ai:cloudChatStream', config),
    abortChat: () => ipcRenderer.invoke('ai:abortChat'),
    onChatUpdate: (callback: (chunk: string) => void) => {
        const listener = (_: any, chunk: string) => callback(chunk);
        ipcRenderer.on('ai:chatChunk', listener);
        return () => ipcRenderer.removeListener('ai:chatChunk', listener);
    }
  },
  system: {
    getProcessStats: (processNames: string[]) => ipcRenderer.invoke('system:getProcessStats', processNames),
    startService: (name: string) => ipcRenderer.invoke('system:startService', name),
    stopService: (name: string) => ipcRenderer.invoke('system:stopService', name),
    deployStack: (service?: string) => ipcRenderer.invoke('system:deployStack', service),
    openDevTools: () => ipcRenderer.send('app:openDevTools'),
    triggerDebugError: (severity: 'warning' | 'error') => ipcRenderer.invoke('debug:triggerError', severity)
  },
  latex: {
    check: () => ipcRenderer.invoke('latex:check'),
    compile: (files: { name: string, content: string }[]) => ipcRenderer.invoke('latex:compile', { files })
  },
  service: {
    start: (service: 'execution' | 'tts') => ipcRenderer.invoke('service:start', service),
    stop: (service: 'execution' | 'tts') => ipcRenderer.invoke('service:stop', service),
    status: (service: 'execution' | 'tts') => ipcRenderer.invoke('service:status', service)
  },
  repl: {
    startSession: (lang: string) => ipcRenderer.invoke('repl:start-session', lang),
    sendInput: (sessionId: string, data: string) => ipcRenderer.send('repl:send-input', sessionId, data),
    stopSession: (sessionId: string) => ipcRenderer.invoke('repl:stop-session', sessionId),
    listContainers: () => ipcRenderer.invoke('repl:list-containers'),
    stopContainer: (containerId: string) => ipcRenderer.invoke('repl:stop-container', containerId),
    removeContainer: (containerId: string) => ipcRenderer.invoke('repl:remove-container', containerId),
    checkSession: (sessionId: string) => ipcRenderer.invoke('repl:check-session', sessionId),
    onOutput: (callback: (data: { sessionId: string, data: string }) => void) => {
        const listener = (_: any, data: any) => callback(data);
        ipcRenderer.on('repl:output', listener);
        return () => ipcRenderer.removeListener('repl:output', listener);
    },
    onClosed: (callback: (data: { sessionId: string, code: number }) => void) => {
        const listener = (_: any, data: any) => callback(data);
        ipcRenderer.on('repl:closed', listener);
        return () => ipcRenderer.removeListener('repl:closed', listener);
    }
  },
  db: {
    initWorkspace: (path: string) => ipcRenderer.invoke('db:init-workspace', path),
    getFeedItems: (feedId: string, limit?: number) => ipcRenderer.invoke('db:getFeedItems', feedId, limit),
    saveFeedItems: (feedId: string, items: any[]) => ipcRenderer.invoke('db:saveFeedItems', feedId, items),
    getFeedStatus: () => ipcRenderer.invoke('db:getFeedStatus'),
    updateFeedStatus: (itemId: string, status: any) => ipcRenderer.invoke('db:updateFeedStatus', itemId, status)
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
