import { app, shell, BrowserWindow, ipcMain, protocol, net, dialog, screen } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import fs from 'fs-extra'
import path from 'path'
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
import { IPC_CHANNELS } from '@shared';
import { GuardrailService } from './services/GuardrailService';
import { feedDb } from './db';
import { AIOrchestrator } from './ai/AIOrchestrator';
import { setupMacOSMenu } from './menu-utils';
import { ModelDownloadService } from './services/ModelDownloadService';
import { findAvailablePort } from './utils/port';

// Determine initial workspace from CLI
let initialWorkspacePath: string | null = null
// Look for a path argument that isn't a flag, skipping the app path itself
const args = process.argv.slice(1);
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
}

// --- macOS specific environment fixes ---
if (process.platform === 'darwin') {
  // Ensure common paths are in the PATH when launched from the Dock
  const commonPaths = ['/usr/local/bin', '/opt/homebrew/bin', '/usr/bin', '/bin', '/usr/sbin', '/sbin'];
  const currentPath = process.env.PATH || '';
  const newPath = Array.from(new Set([...currentPath.split(':'), ...commonPaths]))
    .filter(Boolean)
    .join(':');
  process.env.PATH = newPath;
}

const guardrail = new GuardrailService(initialWorkspacePath);
const aiOrchestrator = new AIOrchestrator(appSettings, feedDb);
const backendManager = new BackendServiceManager(appSettings);
const dockerReplService = new DockerReplService();

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


const isNoLock = args.includes('--no-lock');
const gotTheLock = isNoLock ? true : app.requestSingleInstanceLock()
if (!gotTheLock) {
  console.log('[Main] Another instance is already running. Quitting...')
  app.quit()
} else {
  if (!isNoLock) {
    app.on('second-instance', (_event, commandLine) => {
      console.log(`[Main] Second instance launched. Full command line: ${commandLine.join(' ')}`);
      
      // Use RegEx to find the deep link (e.g., "citadel://clone?url=...") in any argument
      const protocolRegex = /^(["']?)(citadel|codex):\/\/.*?\1$/i;
      const urlMatchRaw = commandLine.find(arg => protocolRegex.test(arg));
      // Strip quotes if they were added by the shell
      const urlMatch = urlMatchRaw ? urlMatchRaw.replace(/^["']|["']$/g, '') : null;
      
      if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore()
        mainWindow.focus()
        
        if (urlMatch) {
          console.log(`[Main] Forwarding deep link to renderer (second-instance): ${urlMatch}`);
          mainWindow.webContents.send('app:onDeepLink', urlMatch);
        } else {
          console.log(`[Main] Second instance triggered, but no valid deep link found.`);
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

let lspPort = 3000;
let ttsPort = 5050;
let qdrantPort = 6333;

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
    mainWindow.webContents.send(IPC_CHANNELS.APP_ON_DEEP_LINK, url);
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

if (potentialPath) {
  // Already handled above
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
    width: 1000,
    height: 600,
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
  // Start in fixed-size "welcome" mode; renderer will request resize when needed.
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    show: false,
    autoHideMenuBar: true,
    resizable: true,
    maximizable: true,
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

  if (process.platform === 'darwin') {
    mainWindow.setWindowButtonVisibility(false);
  }

  // Monitor window state to notify renderer
  const notifyState = () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    mainWindow.webContents.send('window:state-changed', {
      isMaximized: mainWindow.isMaximized(),
      isFullScreen: mainWindow.isFullScreen()
    });
  };

  mainWindow.on('maximize', notifyState);
  mainWindow.on('unmaximize', notifyState);
  mainWindow.on('enter-full-screen', () => {
    if (process.platform === 'darwin') {
      // In fullscreen on Mac, showing traffic lights allows users to exit via native UI
      // and avoids our custom titlebar clashing with the hidden native one
      mainWindow?.setWindowButtonVisibility(true);
    }
    notifyState();
  });
  mainWindow.on('leave-full-screen', () => {
    if (process.platform === 'darwin') {
      mainWindow?.setWindowButtonVisibility(false);
    }
    notifyState();
  });

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
      const protocolRegex = /^(["']?)(citadel|codex):\/\/.*?\1$/i;
      const urlMatchRaw = process.argv.find(arg => protocolRegex.test(arg));
      if (urlMatchRaw) deepLinkUrl = urlMatchRaw.replace(/^["']|["']$/g, '');
    }

    // Initial deep link is now pulled by renderer via get-init-context.
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

  // Listen for native zoom changes (keyboard shortcuts, trackpad, etc.)
  mainWindow.webContents.on('zoom-changed', (_, zoomDirection) => {
    const currentZoom = mainWindow!.webContents.getZoomFactor();
    console.log(`[Main] Zoom changed (${zoomDirection}). Current factor: ${currentZoom}`);
    mainWindow!.webContents.send(IPC_CHANNELS.WINDOW_ON_ZOOM_CHANGE, currentZoom);
  });
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  if (!gotTheLock) return;

  // Show splash screen immediately
  createSplashWindow();

  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  new GitService(guardrail)
  new GitHubService()
  new GitHubAuthService()
  new SecretStorageService()
  new ModelDownloadService()
  // appSettings already initialized
  const fileWatcher = new FileWatcherService()
  registerLatexHandlers()
  aiOrchestrator.registerHandlers()

  // Find available ports for background services
  findAvailablePort(3000).then(port => {
    lspPort = port;
    console.log(`[Main] LSP Port allocated: ${lspPort}`);
    
    // Start LSP Server
    const lspServer = http.createServer((_req, res) => {
      res.writeHead(404);
      res.end();
    });
    new LspServer(lspServer);
    lspServer.on('error', (err: any) => {
      console.error(`[Main] LSP Server error: ${err.message}`);
    });

    lspServer.listen(lspPort, () => {
      console.log(`[Main] LSP Server listening on port ${lspPort}`);
    });

    // Handle closure
    app.on('before-quit', () => lspServer.close());
  });

  findAvailablePort(5050).then(port => {
    ttsPort = port;
    console.log(`[Main] TTS Port allocated: ${ttsPort}`);
  });

  findAvailablePort(6333).then(port => {
    qdrantPort = port;
    console.log(`[Main] Qdrant Port allocated: ${qdrantPort}`);
  });

  // Initialize SQLite feed database for this workspace
  feedDb.setGuardrail();
  if (initialWorkspacePath) {
    feedDb.init(initialWorkspacePath);
  } else {
    feedDb.init(''); // fallback to memory config
  }

  // Docker REPL IPC
  ipcMain.handle(IPC_CHANNELS.REPL_START_SESSION, async (_, lang: string) => {
      return dockerReplService.startSession(lang);
  });
  ipcMain.on('repl:send-input', (_, sessionId: string, data: string) => {
      dockerReplService.sendInput(sessionId, data);
  });
  ipcMain.handle(IPC_CHANNELS.REPL_STOP_SESSION, async (_, sessionId: string) => {
      return dockerReplService.stopSession(sessionId);
  });
  ipcMain.handle(IPC_CHANNELS.REPL_LIST_CONTAINERS, async () => {
      return dockerReplService.listContainers();
  });
  ipcMain.handle(IPC_CHANNELS.REPL_STOP_CONTAINER, async (_, containerId: string) => {
      return dockerReplService.stopContainer(containerId);
  });
  ipcMain.handle(IPC_CHANNELS.REPL_REMOVE_CONTAINER, async (_, containerId: string) => {
      return dockerReplService.removeContainer(containerId);
  });

  dockerReplService.on('output', ({ sessionId, data }) => {
      BrowserWindow.getAllWindows().forEach(win => {
          win.webContents.send(IPC_CHANNELS.REPL_ON_OUTPUT, { sessionId, data });
      });
  });

  dockerReplService.on('closed', ({ sessionId, code }) => {
      BrowserWindow.getAllWindows().forEach(win => {
          win.webContents.send(IPC_CHANNELS.REPL_ON_CLOSED, { sessionId, code });
      });
  });

  // Register Backend Service IPC
  ipcMain.handle(IPC_CHANNELS.SERVICE_START, (_, service: 'execution' | 'tts') => {
      return backendManager.start(service);
  });

  ipcMain.handle(IPC_CHANNELS.SERVICE_STOP, (_, service: 'execution' | 'tts') => {
      return backendManager.stop(service);
  });

  ipcMain.handle(IPC_CHANNELS.SERVICE_STATUS, (_, service: 'execution' | 'tts') => {
      return backendManager.getStatus(service);
  });
  
  // Clean up on exit
  let isQuitting = false;
  app.on('before-quit', async (event) => {
      if (isQuitting) return;
      event.preventDefault();

      console.log('[Main] Graceful shutdown initiated...');

      try {
          // Add a timeout to the overall cleanup to prevent hanging the system
          await Promise.race([
              (async () => {
                  await dockerReplService.cleanupAll();
                  await backendManager.stopAll();
                  feedDb.close();
                  fileWatcher.close();
              })(),
              new Promise((_, reject) => setTimeout(() => reject(new Error('Shutdown timed out')), 15000))
          ]);
          console.log('[Main] Graceful shutdown completed.');
      } catch (e) {
          console.error('[Main] Error during shutdown cleanup:', e);
      } finally {
          isQuitting = true;
          app.quit();
      }
  });

  
  // Register Workspace Discovery IPC
  ipcMain.handle(IPC_CHANNELS.APP_GET_INIT_CONTEXT, () => {
    const url = deepLinkUrl;
    deepLinkUrl = null; // Consume it once read
    return {
      workspacePath: initialWorkspacePath,
      appVersion: app.getVersion(),
      platform: process.platform,
      deepLinkUrl: url,
      lspPort: lspPort,
      ttsPort: ttsPort,
      qdrantPort: qdrantPort
    };
  });

  ipcMain.handle(IPC_CHANNELS.APP_OPEN_WORKSPACE, async (_, path: string) => {
    initialWorkspacePath = path;
    // We relaunch to ensure clean state, passing the new workspace path as an argument
    app.relaunch({ args: process.argv.slice(1).concat([path]) });
    app.exit();
  })

  ipcMain.handle(IPC_CHANNELS.APP_SET_ACTIVE_WORKSPACE, async (_, path: string) => {
       console.log(`[Main] Setting active workspace to: ${path}`);
       // Rebuild trigger: ${new Date().toISOString()}
       if (fs.existsSync(path)) {
           initialWorkspacePath = path; // Update the global variable
           guardrail.setActiveWorkspace(path); // Update the guardrail service state
           return true;
       }
       return false;
  })

  ipcMain.handle(IPC_CHANNELS.WINDOW_SET_ZOOM, (event, zoomFactor: number) => {
    const webContents = event.sender;
    webContents.setZoomFactor(zoomFactor);
    return webContents.getZoomFactor();
  });

  ipcMain.handle(IPC_CHANNELS.WINDOW_GET_ZOOM, (event) => {
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
        // SECURITY: Validate path before reading
        guardrail.validate(finalPath);
        
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
  ipcMain.on(IPC_CHANNELS.APP_PING, () => console.log('pong'))

  // Window Controls IPC
  ipcMain.on(IPC_CHANNELS.WINDOW_MINIMIZE, (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    win?.minimize()
  })

  ipcMain.on(IPC_CHANNELS.WINDOW_MAXIMIZE, (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return

    if (process.platform === 'darwin') {
      // On Mac, maximize button usually enters native fullscreen
      win.setFullScreen(!win.isFullScreen())
    } else {
      if (win.isMaximized()) {
        win.unmaximize()
      } else {
        win.maximize()
      }
    }
  })

  ipcMain.on(IPC_CHANNELS.WINDOW_CLOSE, (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    win?.close()
  })

  // --- Dynamic Window Mode IPCs ---
  ipcMain.on(IPC_CHANNELS.WINDOW_SETUP_WELCOME, (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return
    win.setResizable(true)
    win.setMaximizable(true)
    win.setFullScreenable(true)
    win.setMinimumSize(800, 600)
    win.setSize(1000, 700)
    win.center()
  })

  ipcMain.on(IPC_CHANNELS.WINDOW_SETUP_BUILDER, (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return
    win.setResizable(true)
    win.setMaximizable(true)
    win.setFullScreenable(true)
    win.setMinimumSize(1024, 768)
    win.setSize(1280, 800)
    win.center()
  })

  ipcMain.on(IPC_CHANNELS.WINDOW_SETUP_MAIN, (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return
    win.setResizable(true)
    win.setMaximizable(true)
    win.setFullScreenable(true)
    win.setMinimumSize(1200, 800)
    if (is.dev) {
        win.setSize(1600, 1000)
    } else {
        win.maximize()
    }
    win.center()
  })

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })

  // Set native macOS menu
  if (process.platform === 'darwin') {
    setupMacOSMenu();
  }
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

// Guardrail authorization handled via dedicated service
ipcMain.handle(IPC_CHANNELS.FS_ALLOW_PATH, async (_, targetPath: string) => {
  guardrail.setActiveWorkspace(targetPath);
  console.log(`[Main] Explicitly allowed write path (and set as workspace): ${targetPath}`);
})

ipcMain.handle(IPC_CHANNELS.FS_READ_DIRECTORY, async (_, path) => {
  guardrail.validate(path);
  return fs.readdir(path)
})

ipcMain.handle(IPC_CHANNELS.FS_READ_FILE, async (_, path) => {
  guardrail.validate(path);
  return fs.readFile(path, 'utf-8')
})

ipcMain.handle(IPC_CHANNELS.FS_READ_FILE_BINARY, async (_, path) => {
  guardrail.validate(path);
  const buffer = await fs.readFile(path)
  return buffer
})

ipcMain.handle(IPC_CHANNELS.FS_WRITE_FILE, async (_, path, content) => {
  guardrail.validate(path);
  return fs.outputFile(path, content)
})

ipcMain.handle(IPC_CHANNELS.FS_WRITE_ASSET, async (_, path, content) => {
  guardrail.validate(path);
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

ipcMain.handle(IPC_CHANNELS.FS_CREATE_DIRECTORY, async (_, path) => {
  guardrail.validate(path);
  return fs.ensureDir(path)
})

ipcMain.handle(IPC_CHANNELS.FS_SCAFFOLD_WORKSPACE, async (_, targetPath: string, workspaceName: string, cloneUrl: string) => {
  guardrail.validate(targetPath);
  
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

ipcMain.handle(IPC_CHANNELS.FS_EXISTS, async (_, path) => {
  // Exists is generally safe to allow for checking if a workspace is valid, 
  // but we should still validate to avoid path probing.
  guardrail.validate(path);
  return fs.pathExists(path)
})

ipcMain.handle(IPC_CHANNELS.FS_STAT, async (_, pathArg) => {
  guardrail.validate(pathArg);
  const stats = await fs.stat(pathArg);
  return { mtimeMs: stats.mtimeMs };
})

ipcMain.handle(IPC_CHANNELS.FS_RENAME, async (_, oldPath, newPath) => {
  guardrail.validate(oldPath);
  guardrail.validate(newPath);
  return fs.move(oldPath, newPath, { overwrite: true })
})

ipcMain.handle(IPC_CHANNELS.APP_GET_DOCUMENTS_PATH, async () => {
  return app.getPath('documents')
})
ipcMain.handle(IPC_CHANNELS.APP_GET_DOWNLOADS_PATH, async () => {
  return app.getPath('downloads')
})

ipcMain.handle(IPC_CHANNELS.FS_DELETE_FILE, async (_, path) => {
  guardrail.validate(path);
  return fs.remove(path)
})

ipcMain.handle(IPC_CHANNELS.NET_FETCH, async (_, url, options = {}) => {
  try {
    console.log(`[Main] Fetching with net.fetch: ${url}`)
    const ua = process.platform === 'darwin' 
      ? 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    const response = await net.fetch(url, {
      ...options,
      headers: {
        'User-Agent': ua,
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


;

// Cloud Provider Streaming (OpenAI SSE / Gemini)

  
  ipcMain.handle(IPC_CHANNELS.DIALOG_OPEN_DIRECTORY, async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow!, {
      properties: ['openDirectory']
    })
    if (canceled) {
      return null
    } else {
      const selectedPath = filePaths[0];
      // Whitelist this path in the guardrail so the renderer can probe it (e.g., check for .codex)
      guardrail.allowPathTemporarily(selectedPath);
      return selectedPath;
    }
  })

  ipcMain.handle(IPC_CHANNELS.DIALOG_OPEN_FILE, async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow!, {
      properties: ['openFile']
    })
    if (canceled) {
      return null
    } else {
      return filePaths[0]
    }
  })

  
  // Get process stats by name (for Ollama, Qdrant monitoring)
  ipcMain.handle(IPC_CHANNELS.SYSTEM_GET_PROCESS_STATS, async (_, processNames: string[] = []) => {
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

  ipcMain.on(IPC_CHANNELS.SYSTEM_OPEN_DEV_TOOLS, () => {
    mainWindow?.webContents.openDevTools();
  });

  ipcMain.handle(IPC_CHANNELS.DEBUG_TRIGGER_ERROR, async (_, severity: 'warning' | 'error') => {
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
    mainWindow?.webContents.send(IPC_CHANNELS.APP_ON_LOG, { severity: 'warning', message: args.join(' ') });
  };

  console.error = (...args) => {
    originalError(...args);
    mainWindow?.webContents.send(IPC_CHANNELS.APP_ON_LOG, { severity: 'error', message: args.join(' ') });
  };

  ipcMain.handle(IPC_CHANNELS.SYSTEM_START_SERVICE, async (_, name: string) => {
    const { spawn } = require('child_process');
    console.log(`[Main] Starting service: ${name}`);
    
    try {
      if (name === 'ollama') {
        let ollamaPath = 'ollama';
        if (process.platform === 'darwin') {
          const fallbacks = [
            '/usr/local/bin/ollama',
            '/opt/homebrew/bin/ollama',
            '/Applications/Ollama.app/Contents/Resources/ollama'
          ];
          for (const f of fallbacks) {
            if (fs.existsSync(f)) {
              ollamaPath = f;
              break;
            }
          }
        }
        
        const child = spawn(ollamaPath, ['serve'], {
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

  ipcMain.handle(IPC_CHANNELS.SYSTEM_STOP_SERVICE, async (_, name: string) => {
    const { exec } = require('child_process');
    const util = require('util');
    const execPromise = util.promisify(exec);
    
    console.log(`[Main] Stopping service: ${name}`);
    
    try {
      if (process.platform === 'win32') {
        const exeName = name === 'ollama' ? 'ollama.exe' : 'qdrant.exe';
        await execPromise(`taskkill /IM ${exeName} /F`);
      } else if (process.platform === 'darwin') {
        // More graceful than pkill -f for macOS
        try {
          await execPromise(`killall ${name}`);
        } catch (e) {
          // Fallback to pkill if killall fails
          await execPromise(`pkill -i -f ${name}`);
        }
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

  ipcMain.handle(IPC_CHANNELS.SYSTEM_DEPLOY_STACK, async (_, service?: string) => {
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

