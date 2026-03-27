import { contextBridge, ipcRenderer, shell } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { IPC_CHANNELS } from '@citadel-app/core'

// Custom APIs for renderer
console.log('[Preload] Initializing Codex APIs v1.0.6');
const api = {
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
  system: {
    openDevTools: () => ipcRenderer.send(IPC_CHANNELS.SYSTEM_OPEN_DEV_TOOLS)
  },
  on: (channel: string, callback: (...args: any[]) => void) => {
    const listener = (_: any, ...args: any[]) => callback(...args);
    ipcRenderer.on(channel, listener);
    return () => ipcRenderer.removeListener(channel, listener);
  },
  module: {
    invoke: (moduleId: string, method: string, ...args: any[]) =>
      ipcRenderer.invoke(IPC_CHANNELS.MODULE_INVOKE, moduleId, method, ...args)
  }
}

let apiClaimed = false;
const getCitadelApi = () => {
    if (apiClaimed) {
        console.warn('[Security] Citadel API has already been claimed and sealed.');
        return undefined;
    }
    apiClaimed = true;
    return api;
};

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('claimCitadelApi', getCitadelApi)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.claimCitadelApi = getCitadelApi
}
