import { app, shell, BrowserWindow, ipcMain, protocol, net, dialog, screen } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import fs from 'fs-extra'
import path from 'path'
import os from 'os'
import * as http from 'http';
import { LspServer } from './lsp/LspServer';
// import { LspManager } from './lsp-manager'
import { GitService } from './services/GitService'
import { GitHubService } from './services/GitHubService'
import { GitHubAuthService } from './services/GitHubAuthService'
import { SecretStorageService } from './services/SecretStorageService'
import { AppSettingsService } from './services/AppSettingsService'
const appSettings = new AppSettingsService();
import { FileWatcherService } from './services/FileWatcherService'
import { registerLatexHandlers } from './latex-compiler'
import { BackendServiceManager } from './services/BackendServiceManager';
import { DockerReplService } from './services/DockerReplService';
import { feedDb } from './db';

// Gracefully handle known Electron ByteString header bug
// Some servers return non-ASCII chars in HTTP headers which crashes Electron's undici layer
process.on('uncaughtException', (error) => {
    if (error instanceof TypeError && error.message.includes('ByteString')) {
        console.warn('[Main] Suppressed ByteString header error:', error.message);
        return;
    }
    // Re-throw unknown errors so they still crash as expected
    throw error;
});

// Parse CLI Args for Services
const args = process.argv.slice(1);

const backendManager = new BackendServiceManager(appSettings);
const dockerReplService = new DockerReplService();

// --- SINGLE INSTANCE LOCK ---
const isNoLock = args.includes('--no-lock');
const gotTheLock = isNoLock ? true : app.requestSingleInstanceLock()
if (!gotTheLock) {
  console.log('[Main] Another instance is already running. Quitting...')
  app.quit()
} else {
  if (!isNoLock) {
    app.on('second-instance', (_event, commandLine) => {
      console.log('[Main] Second instance launched. Focusing existing instance...')
      
      // Look for a deep link (e.g., citadel://clone?url=...) in the command line args
      // Typical args: [ 'path/to/exe', 'citadel://clone?url=...' ]
      const urlMatch = commandLine.find(arg => arg.startsWith('citadel://') || arg.startsWith('codex://'));
      
      if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore()
        mainWindow.focus()
        
        if (urlMatch) {
          console.log(`[Main] Forwarding deep link to renderer: ${urlMatch}`);
          mainWindow.webContents.send('app:onDeepLink', urlMatch);
        }
      } else if (urlMatch) {
        // If window isn't ready yet, save it to be processed later
        deepLinkUrl = urlMatch;
      }
    })
  } else {
    console.log('[Main] Starting with --no-lock (Bypassing single instance check)')
  }
}
// ----------------------------

// Parse CLI Args for Services
if (args.includes('--with-execution')) {
    backendManager.start('execution');
}
if (args.includes('--with-tts')) {
    backendManager.start('tts');
}

// Parse Data Path Overrides
const ttsDataIdx = args.indexOf('--tts-data');
if (ttsDataIdx !== -1 && args[ttsDataIdx + 1]) {
    appSettings.updateSetting('ttsDataPath', args[ttsDataIdx + 1]);
}
const qdrantDataIdx = args.indexOf('--qdrant-data');
if (qdrantDataIdx !== -1 && args[qdrantDataIdx + 1]) {
    appSettings.updateSetting('qdrantDataPath', args[qdrantDataIdx + 1]);
}

// Register custom protocol privileges immediately
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'citadel',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      bypassCSP: true
    }
  },
  {
    scheme: 'codex',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      bypassCSP: true
    }
  }
])

if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient('citadel', process.execPath, [path.resolve(process.argv[1])])
    app.setAsDefaultProtocolClient('codex', process.execPath, [path.resolve(process.argv[1])])
  }
} else {
  app.setAsDefaultProtocolClient('citadel')
  app.setAsDefaultProtocolClient('codex')
}

let deepLinkUrl: string | null = null;

// Handle macOS direct open-url
app.on('open-url', (event, url) => {
  event.preventDefault();
  
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('app:onDeepLink', url);
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  } else {
    deepLinkUrl = url;
  }
})

// Custom URI scheme for local resources
let mainWindow: BrowserWindow | null = null
let splashWindow: BrowserWindow | null = null
// const lspManager = new LspManager()

// Determine initial workspace from CLI
let initialWorkspacePath: string | null = null
// Look for a path argument that isn't a flag, skipping the app path itself
const potentialPath = args.find(arg => {
  if (arg.startsWith('-') || arg.endsWith('.exe') || arg.includes('node_modules')) return false;
  if (arg.startsWith('citadel://') || arg.startsWith('codex://')) return false;
  const resolved = path.resolve(arg);
  // In dev mode, the first arg is often '.', ignore it
  if (is.dev && (arg === '.' || resolved === path.resolve(process.cwd()))) return false;
  return fs.existsSync(resolved);
});

if (potentialPath) {
  initialWorkspacePath = path.resolve(potentialPath);
  console.log(`[Main] Initial workspace detected from CLI: ${initialWorkspacePath}`);
} else {
  console.log(`[Main] No workspace detected in CLI args: ${args.join(' ')}`);
}


function createSplashWindow(): void {
  
  const primaryDisplay = screen.getPrimaryDisplay();
  
  // Total screen resolution (e.g., 1920x1080)
  const { width, height } = primaryDisplay.size; 
  
  // Available area (excluding taskbar/dock)
  const { width: workWidth, height: workHeight } = primaryDisplay.workAreaSize;

  console.log(`Resolution: ${width}x${height}`);
  console.log(`Work Area: ${workWidth}x${workHeight}`);
  
  splashWindow = new BrowserWindow({
    width: 480,
    height: 300,
    frame: false,
    transparent: true,
    resizable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    show: false,
    icon,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  const splashPath = is.dev
    ? join(__dirname, '../../resources/splash.html')
    : join(process.resourcesPath, 'splash.html');
  splashWindow.loadFile(splashPath);
  splashWindow.once('ready-to-show', () => {
    splashWindow?.show();
    splashWindow?.center();
  });
}

function createWindow(): void {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    titleBarStyle: 'hidden', // Frameless but resizable
    titleBarOverlay: false, // We will draw our own controls
    icon,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      webSecurity: false, // Allow loading external resources (CORS)
      webviewTag: true // Enable <webview> tag
    }
  })

  let isForceClose = false;

  mainWindow.on('close', (e) => {
    if (isForceClose) return;

    // Check if renderer is ready/loaded
    if (mainWindow && !mainWindow.webContents.isLoading()) {
        e.preventDefault();
        mainWindow.webContents.send('app:close-request');
    }
  });

  ipcMain.on('app:close-confirmed', () => {
    isForceClose = true;
    mainWindow?.close();
  });

  mainWindow.on('ready-to-show', () => {
    // Close splash and show main window
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.close();
      splashWindow = null;
    }
    mainWindow!.show();

    // Check if we have a deep link from startup that needs to be processed
    if (!deepLinkUrl && process.platform !== 'darwin') {
      const urlMatch = process.argv.find(arg => arg.startsWith('citadel://') || arg.startsWith('codex://'));
      if (urlMatch) deepLinkUrl = urlMatch;
    }

    if (deepLinkUrl) {
      console.log(`[Main] Sending initial deep link to renderer: ${deepLinkUrl}`);
      // Slight delay to ensure React has mounted its event listeners
      setTimeout(() => {
        mainWindow?.webContents.send('app:onDeepLink', deepLinkUrl);
        deepLinkUrl = null;
      }, 500);
    }
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Show splash screen immediately
  createSplashWindow();

  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  new GitService()
  new GitHubService()
  new GitHubAuthService()
  new SecretStorageService()
  // appSettings already initialized
  new FileWatcherService()
  registerLatexHandlers()

  // Initialize SQLite feed database for this workspace
  if (initialWorkspacePath) {
    feedDb.init(initialWorkspacePath);
  } else {
    feedDb.init(''); // fallback to memory config
  }

  // Docker REPL IPC
  ipcMain.handle('repl:start-session', async (_, lang: string) => {
      return dockerReplService.startSession(lang);
  });
  ipcMain.on('repl:send-input', (_, sessionId: string, data: string) => {
      dockerReplService.sendInput(sessionId, data);
  });
  ipcMain.handle('repl:stop-session', async (_, sessionId: string) => {
      return dockerReplService.stopSession(sessionId);
  });
  ipcMain.handle('repl:list-containers', async () => {
      return dockerReplService.listContainers();
  });
  ipcMain.handle('repl:stop-container', async (_, containerId: string) => {
      return dockerReplService.stopContainer(containerId);
  });
  ipcMain.handle('repl:remove-container', async (_, containerId: string) => {
      return dockerReplService.removeContainer(containerId);
  });

  dockerReplService.on('output', ({ sessionId, data }) => {
      BrowserWindow.getAllWindows().forEach(win => {
          win.webContents.send('repl:output', { sessionId, data });
      });
  });

  dockerReplService.on('closed', ({ sessionId, code }) => {
      BrowserWindow.getAllWindows().forEach(win => {
          win.webContents.send('repl:closed', { sessionId, code });
      });
  });

  // Register Backend Service IPC
  ipcMain.handle('service:start', (_, service: 'execution' | 'tts') => {
      return backendManager.start(service);
  });

  ipcMain.handle('service:stop', (_, service: 'execution' | 'tts') => {
      return backendManager.stop(service);
  });

  ipcMain.handle('service:status', (_, service: 'execution' | 'tts') => {
      return backendManager.getStatus(service);
  });
  
  // Clean up on exit
  app.on('before-quit', async () => {
      await dockerReplService.cleanupAll();
      backendManager.stopAll();
      feedDb.close();
  });

  // Start LSP Server
  const lspServer = http.createServer((_req, res) => {
    res.writeHead(404);
    res.end();
  });
  new LspServer(lspServer);
  lspServer.listen(3000, () => {
    console.log('[Main] LSP Server listening on port 3000');
  });
  
  // Register Workspace Discovery IPC
  ipcMain.handle('app:get-init-context', () => ({
    workspacePath: initialWorkspacePath,
    appVersion: app.getVersion(),
    platform: process.platform
  }))

  ipcMain.handle('app:open-workspace', async (_, path: string) => {
    initialWorkspacePath = path;
    // We relaunch to ensure clean state, passing the new workspace path as an argument
    app.relaunch({ args: process.argv.slice(1).concat([path]) });
    app.exit();
  })

  ipcMain.handle('app:set-active-workspace', async (_, path: string) => {
       console.log(`[Main] Setting active workspace to: ${path}`);
       if (fs.existsSync(path)) {
           initialWorkspacePath = path; // Update the global variable used by guardrails
           return true;
       }
       return false;
  })

  ipcMain.handle('window:set-zoom', (event, zoomFactor: number) => {
    const webContents = event.sender;
    webContents.setZoomFactor(zoomFactor);
    return webContents.getZoomFactor();
  });

  ipcMain.handle('window:get-zoom', (event) => {
    return event.sender.getZoomFactor();
  });
  
  // Register protocol handler
  // Register protocol handler
  protocol.handle('codex', (request) => {
    const url = request.url
    console.log(`[Codex Protocol] Raw Request: ${url}`)
    
    // 1. Remove scheme and ANY number of leading slashes
    let rawPath = url.replace(/^codex:[\/]*/, '')
    
    // 2. DecodeURI
    rawPath = decodeURIComponent(rawPath)
    
    // 3. Determine absolute vs relative
    let absolutePath = rawPath
    
    // Windows check: starts with drive letter like C: or C/ or c:
    const isWindowsAbsolute = /^[a-zA-Z]:(?:\\|\/)/.test(rawPath) || /^\/?[a-zA-Z][:|\/]/.test(rawPath)
    const isPosixAbsolute = rawPath.startsWith('/') && !/^\/[a-zA-Z][:|\/]/.test(rawPath)
    
    if (isWindowsAbsolute) {
        // Normalize /C/path or C/path or c:/path to C:/path
        let cleaned = rawPath.replace(/^\//, '')
        const driveLetter = cleaned[0].toUpperCase()
        
        if (cleaned[1] === ':') {
            const rest = cleaned.slice(2);
            absolutePath = `${driveLetter}:${rest.startsWith('/') || rest.startsWith('\\') ? '' : '/'}${rest}`
        } else if (cleaned[1] === '/' || cleaned[1] === '|') {
            absolutePath = `${driveLetter}:${cleaned.slice(1)}`
        } else {
            absolutePath = `${driveLetter}:/${cleaned.slice(1)}`
        }
        console.log(`[Codex Protocol] Windows Reconstruction: ${absolutePath}`)
    } else if (isPosixAbsolute) {
        // Leave POSIX path as-is (already absolute)
        absolutePath = rawPath;
        console.log(`[Codex Protocol] POSIX Path: ${absolutePath}`);
    } else {
        // Assume relative to workspace
        if (initialWorkspacePath) {
            absolutePath = path.join(initialWorkspacePath, rawPath)
        }
    }

    // 4. Normalize and resolve to full absolute path
    const finalResolvedPath = path.resolve(absolutePath);
    console.log(`[Codex Protocol] Resolved Path: ${finalResolvedPath}`)

    // 5. Check existence with fallback
    let finalPath = finalResolvedPath
    if (!fs.existsSync(finalPath)) {
        console.warn(`[Codex Protocol] 404 at ${finalPath}. Looking for fallbacks...`)
        
        const fileName = path.basename(finalResolvedPath)
        if (initialWorkspacePath && fileName.includes('.')) {
            // Search in ALL folders defined in standard config + general assets
            const foldersToSearch = [
                'assets',
                '03_Papers/assets',
                '03_papers/assets',
                '01_Problems/assets',
                '02_Design/assets',
                '04_RFCs/assets',
                '05_Blogs/assets',
                '06_Standards/assets',
                '07_Books/assets'
            ]
            
            for (const relDir of foldersToSearch) {
                const trial = path.join(initialWorkspacePath, relDir, fileName)
                if (fs.existsSync(trial)) {
                    console.log(`[Codex Protocol] RECOVERED asset at: ${trial}`)
                    finalPath = trial
                    break
                }
            }
        }
    }

    if (!fs.existsSync(finalPath)) {
        console.error(`[Codex Protocol] FAILED to resolve: ${url}`)
        console.error(`[Codex Protocol] Attempted Path: ${finalPath}`)
        console.error(`[Codex Protocol] Workspace Root: ${initialWorkspacePath}`)
        
        return new Response(`File not found.\nURL: ${url}\nResolved Path: ${finalPath}\nWorkspace: ${initialWorkspacePath}`, { 
            status: 404,
            statusText: 'Not Found'
        })
    }

    try {
        const data = fs.readFileSync(finalPath)
        const ext = finalPath.split('.').pop()?.toLowerCase()
        let mimeType = 'application/octet-stream'
        if (ext === 'png') mimeType = 'image/png'
        else if (ext === 'jpg' || ext === 'jpeg') mimeType = 'image/jpeg'
        else if (ext === 'gif') mimeType = 'image/gif'
        else if (ext === 'svg') mimeType = 'image/svg+xml'
        else if (ext === 'webp') mimeType = 'image/webp'
        else if (ext === 'pdf') mimeType = 'application/pdf'

        return new Response(data, { 
            headers: { 
                'content-type': mimeType,
                'Access-Control-Allow-Origin': '*' 
            }
        })
    } catch (e) {
        console.error(`[Codex Protocol] Error reading file ${finalPath}:`, e)
        return new Response('Internal Error', { status: 500 })
    }
  })

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // Handle <webview> tag in renderer
  app.on('web-contents-created', (_, contents) => {
      // Check if this is a webview (guest)
      if (contents.getType() === 'webview') {
          // Listen for navigation events to strip X-Frame-Options
          contents.session.webRequest.onHeadersReceived((details, callback) => {
              const responseHeaders = details.responseHeaders || {};

              // Sanitize non-ASCII header values to prevent ByteString crash
              for (const key of Object.keys(responseHeaders)) {
                  const values = responseHeaders[key];
                  if (Array.isArray(values)) {
                      responseHeaders[key] = values.map(v =>
                          typeof v === 'string' ? v.replace(/[^\x00-\xFF]/g, '') : v
                      );
                  }
              }
              
              // Remove headers that might prevent embedding
              delete responseHeaders['x-frame-options'];
              delete responseHeaders['X-Frame-Options'];
              
              callback({ 
                  responseHeaders,
                  statusLine: details.statusLine 
              });
          });

          // Also allow the webview to open links in external browser
          contents.setWindowOpenHandler(({ url }) => {
              shell.openExternal(url);
              return { action: 'deny' };
          });
      }
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  // Window Controls IPC
  ipcMain.on('window:minimize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    win?.minimize()
  })

  ipcMain.on('window:maximize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (win?.isMaximized()) {
      win.unmaximize()
    } else {
      win?.maximize()
    }
  })

  ipcMain.on('window:close', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    win?.close()
  })

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

// Helper to validate paths
const pendingWorkspacePaths = new Set<string>();

function isAllowedWritePath(targetPath: string): boolean {
  const resolved = path.resolve(targetPath);
  
  // 1. Allow UserData (for app-settings.json)
  const userDataPath = app.getPath('userData');
  if (resolved.startsWith(path.resolve(userDataPath))) {
    return true;
  }

  // 2. Allow Workspace
  if (initialWorkspacePath && resolved.startsWith(path.resolve(initialWorkspacePath))) {
    return true;
  }

  // 3. Allow Temp (for intermediate latex files)
  const tempDir = os.tmpdir();
  if (resolved.startsWith(path.resolve(tempDir))) {
     return true;
  }

  // 4. Allow pending workspace creation paths
  for (const allowed of pendingWorkspacePaths) {
    if (resolved.startsWith(path.resolve(allowed))) {
      return true;
    }
  }

  console.error(`[Main] Blocked write to unauthorized path: ${resolved}`);
  return false;
}

ipcMain.handle('fs:allowPath', async (_, targetPath: string) => {
  const resolved = path.resolve(targetPath);
  
  // Hard block writing to the exact process.cwd() or application root 
  // to avoid accidentally cloning repositories into the source code bundle.
  const cwd = path.resolve(process.cwd());
  const dirname = path.resolve(__dirname);
  
  if (resolved === cwd || resolved === dirname) {
     console.error(`[Main] CRITICAL: Blocked attempt to authorize the application root directory as a workspace: ${resolved}`);
     throw new Error("Cannot use the application's source directory as a workspace. Please choose a different folder.");
  }
  
  pendingWorkspacePaths.add(resolved);
  console.log(`[Main] Allowed write path: ${resolved}`);
})

ipcMain.handle('fs:readDirectory', async (_, path) => {
  return fs.readdir(path)
})

ipcMain.handle('fs:readFile', async (_, path) => {
  return fs.readFile(path, 'utf-8')
})

ipcMain.handle('fs:readFileBinary', async (_, path) => {
  const buffer = await fs.readFile(path)
  return buffer
})

ipcMain.handle('fs:writeFile', async (_, path, content) => {
  if (!isAllowedWritePath(path)) {
      throw new Error(`Access Denied: Cannot write to ${path}`);
  }
  return fs.outputFile(path, content)
})

ipcMain.handle('fs:writeAsset', async (_, path, content) => {
  if (!isAllowedWritePath(path)) {
      throw new Error(`Access Denied: Cannot write to ${path}`);
  }
  console.log(`[Main] Writing asset to ${path}. Size: ${content.length}`)
  try {
      await fs.outputFile(path, content)
      console.log(`[Main] Successfully wrote asset to ${path}`)
      return true
  } catch (error) {
      console.error(`[Main] Failed to write asset to ${path}:`, error)
      throw error
  }
})

ipcMain.handle('fs:createDirectory', async (_, path) => {
  if (!isAllowedWritePath(path)) {
      throw new Error(`Access Denied: Cannot create directory at ${path}`);
  }
  return fs.ensureDir(path)
})

ipcMain.handle('fs:scaffoldWorkspace', async (_, targetPath: string, workspaceName: string, cloneUrl: string) => {
  if (!isAllowedWritePath(targetPath)) {
      throw new Error(`Access Denied: Cannot scaffold to unauthorized path ${targetPath}`);
  }
  
  const templateDir = is.dev 
      ? join(__dirname, '../../resources/template')
      : join(process.resourcesPath, 'template');

  console.log(`[Main] Scaffolding workspace from ${templateDir} to ${targetPath}`);
  
  if (!fs.existsSync(templateDir)) {
      console.warn(`[Main] Template directory not found: ${templateDir}`);
      return false;
  }

  // Copy everything
  await fs.copy(templateDir, targetPath, { overwrite: true });

  // Read README and replace variables
  const readmePath = join(targetPath, 'README.md');
  if (fs.existsSync(readmePath)) {
      let content = await fs.readFile(readmePath, 'utf-8');
      content = content.replace(/{{WORKSPACE_NAME}}/g, workspaceName);
      content = content.replace(/{{CLONE_URL}}/g, cloneUrl || '');
      await fs.outputFile(readmePath, content);
  }

  return true;
})

ipcMain.handle('fs:exists', async (_, path) => {
  return fs.pathExists(path)
})

ipcMain.handle('fs:rename', async (_, oldPath, newPath) => {
  // We must ensure we are not moving something OUT of the workspace, 
  // nor moving something INTO a protected area (though inconsistent).
  // Safest is to require both source and dest to be allowed, 
  // or at least destination.
  // Let's enforce destination is allowed. Moving a file FROM outside TO inside might be okay?
  // But moving FROM outside effectively deletes it from outside. 
  // So both must be safe.
  if (!isAllowedWritePath(oldPath)) {
       throw new Error(`Access Denied: Cannot rename from unauthorized path ${oldPath}`);
  }
  if (!isAllowedWritePath(newPath)) {
       throw new Error(`Access Denied: Cannot rename to unauthorized path ${newPath}`);
  }
  return fs.move(oldPath, newPath, { overwrite: true })
})

ipcMain.handle('app:getDocumentsPath', async () => {
  return app.getPath('documents')
})

ipcMain.handle('fs:deleteFile', async (_, path) => {
  if (!isAllowedWritePath(path)) {
       throw new Error(`Access Denied: Cannot delete ${path}`);
  }
  return fs.remove(path)
})

ipcMain.handle('net:fetch', async (_, url, options = {}) => {
  try {
    console.log(`[Main] Fetching with net.fetch: ${url}`)
    const response = await net.fetch(url, {
      ...options,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        ...options.headers
      }
    })
    const text = await response.text()
    return {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      text: text
    }
  } catch (error: any) {
    if (error instanceof TypeError && error.message?.includes('ByteString')) {
        console.warn(`[Main] ByteString header error for ${url}:`, error.message);
        return {
            ok: false,
            status: 0,
            statusText: 'Response contained non-ASCII headers',
            text: ''
        };
    }

    const isLocal = url.includes('localhost') || url.includes('127.0.0.1');
    const isConnRefused = error.message?.includes('net::ERR_CONNECTION_REFUSED');
    
    if (isLocal && isConnRefused) {
        // Silenced: local service not reachable (expected if stopped)
    } else {
        console.error(`[Main] Fetch error for ${url}:`, error);
    }
    
    return {
      ok: false,
      status: 0,
      statusText: error.message,
      text: ''
    }
  }
})

let currentChatController: AbortController | null = null;

ipcMain.handle('ai:abortChat', () => {
  if (currentChatController) {
    console.log('[Main] Aborting active chat stream');
    currentChatController.abort();
    currentChatController = null;
  }
  return true;
});

ipcMain.handle('ai:chatStream', async (event, baseUrl: string, payload: any) => {
  let fullText = '';
  try {
    // Abort any existing stream
    if (currentChatController) {
      currentChatController.abort();
    }
    currentChatController = new AbortController();
    const signal = currentChatController.signal;

    console.log(`[Main] Streaming generation from ${baseUrl} with model: ${payload.model}`);
    console.log(`[Main] Prompt Length: ${payload.prompt?.length || 0}`);
    console.log(`[Main] Prompt Starters: "${payload.prompt?.substring(0, 50)}..."`);

    const response = await net.fetch(`${baseUrl}/api/generate`, {
      method: 'POST',
      body: JSON.stringify({ ...payload, stream: true }),
      signal
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Main] Ollama API Error (${response.status}):`, errorText);
      throw new Error(`Failed to stream chat: ${response.status} ${response.statusText} - ${errorText}`);
    }

    if (!response.body) return true;

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    let buffer = '';
    while (true) {
      if (signal.aborted) break;
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      buffer += chunk;
      
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep the last partial line in the buffer

      for (const line of lines) {
        if (line.trim() === '') continue;
        if (signal.aborted) break;
        try {
          const data = JSON.parse(line);
          if (data.response) {
            fullText += data.response;
            event.sender.send('ai:chatChunk', data.response);
          }
          if (data.done) {
            console.log(`[Main] Stream done. Total length: ${fullText.length}`);
            break;
          }
        } catch (e) {
          console.error('[Main] JSON parsing error for line:', line, e);
        }
      }
    }
    return fullText;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.log('[Main] Chat stream aborted by user');
      return fullText;
    }
    console.error('[Main] Chat stream error:', error);
    throw error;
  } finally {
    currentChatController = null;
  }
})
;

// Cloud Provider Streaming (OpenAI SSE / Gemini)
ipcMain.handle('ai:cloudChatStream', async (event, config: {
  provider: 'openai' | 'gemini' | 'azure-foundry',
  baseUrl: string,
  apiKey: string,
  model: string,
  prompt: string,
  system?: string,
  temperature?: number
}) => {
  let fullText = '';
  try {
    if (currentChatController) {
      currentChatController.abort();
    }
    currentChatController = new AbortController();
    const signal = currentChatController.signal;

    console.log(`[Main] Cloud stream: provider=${config.provider}, model=${config.model}`);

    let url: string;
    let headers: Record<string, string>;
    let body: string;

    if (config.provider === 'gemini') {
      // Gemini streaming via streamGenerateContent
      url = `${config.baseUrl}/models/${config.model}:streamGenerateContent?alt=sse&key=${config.apiKey}`;
      headers = { 'Content-Type': 'application/json' };

      const contents: any[] = [];
      if (config.system) {
        contents.push({ role: 'user', parts: [{ text: config.system }] });
        contents.push({ role: 'model', parts: [{ text: 'Understood.' }] });
      }
      contents.push({ role: 'user', parts: [{ text: config.prompt }] });

      body = JSON.stringify({
        contents,
        generationConfig: { temperature: config.temperature ?? 0.7 }
      });
    } else {
      // OpenAI / Azure OpenAI SSE
      url = `${config.baseUrl}/chat/completions`;
      headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`
      };

      const messages: any[] = [];
      if (config.system) messages.push({ role: 'system', content: config.system });
      messages.push({ role: 'user', content: config.prompt });

      body = JSON.stringify({
        model: config.model,
        messages,
        temperature: config.temperature ?? 0.7,
        stream: true
      });
    }

    const response = await net.fetch(url, {
      method: 'POST',
      headers,
      body,
      signal
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Main] Cloud API Error (${response.status}):`, errorText);
      throw new Error(`Cloud stream failed: ${response.status} - ${errorText}`);
    }

    if (!response.body) return '';

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      if (signal.aborted) break;
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (signal.aborted) break;
        const trimmed = line.trim();
        if (trimmed === '' || trimmed === 'data: [DONE]') continue;

        const dataStr = trimmed.startsWith('data: ') ? trimmed.slice(6) : trimmed;
        if (!dataStr) continue;

        try {
          const data = JSON.parse(dataStr);
          let chunk = '';

          if (config.provider === 'gemini') {
            // Gemini SSE format
            chunk = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
          } else {
            // OpenAI SSE format
            chunk = data.choices?.[0]?.delta?.content || '';
          }

          if (chunk) {
            fullText += chunk;
            event.sender.send('ai:chatChunk', chunk);
          }
        } catch (e) {
          // Skip unparseable lines
        }
      }
    }

    console.log(`[Main] Cloud stream done. Total length: ${fullText.length}`);
    return fullText;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.log('[Main] Cloud stream aborted by user');
      return fullText;
    }
    console.error('[Main] Cloud stream error:', error);
    throw error;
  } finally {
    currentChatController = null;
  }
});

  ipcMain.handle('ai:pullModel', async (event, baseUrl: string, model: string) => {
    try {
      console.log(`[Main] Pulling model ${model} from ${baseUrl}`)
      const response = await net.fetch(`${baseUrl}/api/pull`, {
        method: 'POST',
        body: JSON.stringify({ name: model, stream: true })
      })

      if (!response.ok) {
        throw new Error(`Failed to pull model: ${response.statusText}`)
      }

      if (!response.body) return true

      const reader = response.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        
        const chunk = decoder.decode(value)
        const lines = chunk.split('\n').filter(Boolean)
        
        for (const line of lines) {
          try {
            const data = JSON.parse(line)
            if (data.status) {
              // Send detailed progress to renderer
              event.sender.send('ai:pullProgress', {
                status: data.status,
                completed: data.completed,
                total: data.total,
                digest: data.digest
              })
            }
          } catch (e) {
            // ignore partial JSON
          }
        }
      }
      return true
    } catch (error: any) {
      console.error('[Main] Pull model error:', error)
      throw error
    }
  })

  ipcMain.handle('dialog:openDirectory', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow!, {
      properties: ['openDirectory']
    })
    if (canceled) {
      return null
    } else {
      return filePaths[0]
    }
  })

  ipcMain.handle('dialog:openFile', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow!, {
      properties: ['openFile']
    })
    if (canceled) {
      return null
    } else {
      return filePaths[0]
    }
  })

  ipcMain.handle('ai:getHardwareSpecs', async () => {
    try {
      const si = require('systeminformation');
      const [mem, graphics, cpu, disk] = await Promise.all([
        si.mem(),
        si.graphics(),
        si.cpu(),
        si.fsSize()
      ]);

      // Get the primary OS drive (Windows 'C:', Linux/Mac '/')
      const mainDisk = disk.find(d => d.mount === 'C:' || d.mount === '/' || d.mount === 'C:\\') || disk[0];

      return {
        totalMemory: mem.total,
        gpus: graphics.controllers.map(g => ({ model: g.model, vram: g.vram })),
        cpu: {
          flags: cpu.flags,
          cores: cpu.cores
        },
        storage: mainDisk ? mainDisk.available : 0
      };
    } catch (error) {
      console.error('[Main] Failed to get hardware specs:', error);
      return null;
    }
  })

  // Get process stats by name (for Ollama, Qdrant monitoring)
  ipcMain.handle('system:getProcessStats', async (_, processNames: string[] = []) => {
    try {
      const si = require('systeminformation');
      const processes = await si.processes();
      
      const results: Record<string, { cpu: number; memory: number; memoryMB: number } | null> = {};
      
      for (const name of processNames) {
        // Find process by name (case-insensitive, partial match)
        const proc = processes.list.find((p: any) => 
          p.name.toLowerCase().includes(name.toLowerCase()) ||
          p.command?.toLowerCase().includes(name.toLowerCase())
        );
        
        if (proc) {
          results[name] = {
            cpu: proc.cpu || 0,
            memory: proc.mem || 0,
            memoryMB: Math.round((proc.memRss || 0) / 1024 / 1024)
          };
        } else {
          results[name] = null;
        }
      }
      
      return results;
    } catch (error) {
      console.error('[Main] Failed to get process stats:', error);
      return {};
    }
  })

  ipcMain.on('app:openDevTools', () => {
    mainWindow?.webContents.openDevTools();
  });

  ipcMain.handle('debug:triggerError', async (_, severity: 'warning' | 'error') => {
    if (severity === 'error') {
      console.error('[Debug] Test error triggered by user');
    } else {
      console.warn('[Debug] Test warning triggered by user');
    }
    return true;
  });

  // Intercept console logs to notify renderer
  const originalWarn = console.warn;
  const originalError = console.error;

  console.warn = (...args) => {
    originalWarn(...args);
    mainWindow?.webContents.send('app:onLog', { severity: 'warning', message: args.join(' ') });
  };

  console.error = (...args) => {
    originalError(...args);
    mainWindow?.webContents.send('app:onLog', { severity: 'error', message: args.join(' ') });
  };

  ipcMain.handle('system:startService', async (_, name: string) => {
    const { spawn } = require('child_process');
    console.log(`[Main] Starting service: ${name}`);
    
    try {
      if (name === 'ollama') {
        const child = spawn('ollama', ['serve'], {
          detached: true,
          stdio: 'ignore'
        });
        child.unref();
      } else if (name === 'qdrant') {
        const { exec } = require('child_process');
        const util = require('util');
        const execPromise = util.promisify(exec);
        let composePath = process.cwd();
        if (app.isPackaged) {
          composePath = path.join(process.resourcesPath, 'tts-service');
        }
        const qdrantSettings = appSettings.getSetting('ai') as any;
        const qdrantUrl = qdrantSettings?.qdrant?.baseUrl || 'http://localhost:6333';
        let qdrantPort = '6333';
        try { qdrantPort = new URL(qdrantUrl).port || '6333'; } catch {}
        const env = { ...process.env, QDRANT_PORT: qdrantPort, QDRANT_DATA_PATH: appSettings.getSetting('qdrantDataPath') || '' };
        await execPromise('docker-compose up -d qdrant', { cwd: composePath, env });
      }
      return true;
    } catch (e) {
      console.error(`[Main] Failed to start service ${name}:`, e);
      throw e;
    }
  });

  ipcMain.handle('system:stopService', async (_, name: string) => {
    const { exec } = require('child_process');
    const util = require('util');
    const execPromise = util.promisify(exec);
    
    console.log(`[Main] Stopping service: ${name}`);
    
    try {
      if (process.platform === 'win32') {
        const exeName = name === 'ollama' ? 'ollama.exe' : 'qdrant.exe';
        await execPromise(`taskkill /IM ${exeName} /F`);
      } else {
        await execPromise(`pkill -f ${name}`);
      }
      return true;
    } catch (e) {
      console.error(`[Main] Failed to stop service ${name}:`, e);
      // If process not found, we don't necessarily want to throw
      return false;
    }
  });

  ipcMain.handle('system:deployStack', async (_, service?: string) => {
    const { exec } = require('child_process');
    const util = require('util');
    const execPromise = util.promisify(exec);
    const path = require('path');
    
    // Determine where the docker-compose file is located
    let composePath = process.cwd();
    
    if (app.isPackaged) {
        composePath = path.join(process.resourcesPath, 'tts-service');
        console.log(`[Main] Production mode detected. Using compose path: ${composePath}`);
    } else {
        console.log(`[Main] Dev mode detected. Using CWD: ${composePath}`);
    }

    try {
       const composeFile = path.join(composePath, 'docker-compose.yml');
       if (!fs.existsSync(composeFile)) {
           throw new Error(`docker-compose.yml not found at ${composePath}`);
       }

       const serviceLabel = service || 'Full Stack (TTS + Qdrant)';
       console.log(`[Main] Deploying ${serviceLabel} from: ${composePath}`);

       // Extract ports from configured URLs
       const ttsUrl = appSettings.getSetting('ttsUrl') || 'http://localhost:5050';
       const qdrantSettings = appSettings.getSetting('ai') as any;
       const qdrantUrl = qdrantSettings?.qdrant?.baseUrl || 'http://localhost:6333';
       
       const extractPort = (url: string, fallback: string): string => {
           try { return new URL(url).port || fallback; } catch { return fallback; }
       };

       const env = { 
           ...process.env,
           TTS_DATA_PATH: appSettings.getSetting('ttsDataPath') || '',
           QDRANT_DATA_PATH: appSettings.getSetting('qdrantDataPath') || '',
           TTS_PORT: extractPort(ttsUrl, '5050'),
           QDRANT_PORT: extractPort(qdrantUrl, '6333')
       };

       // If a specific service is provided, deploy only that service
       const cmd = service 
           ? `docker-compose up -d --build ${service}`
           : 'docker-compose up -d --build';

       const { stdout, stderr } = await execPromise(cmd, { 
           cwd: composePath,
           env
       });
       console.log('[Main] Docker compose stdout:', stdout);
       if (stderr) console.warn('[Main] Docker compose stderr:', stderr);
       return { success: true, output: stdout };
    } catch (e: any) {
       console.error('[Main] Docker deploy failed:', e);
       return { success: false, error: e.message };
    }
  });

