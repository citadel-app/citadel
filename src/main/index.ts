import { app, shell, BrowserWindow, ipcMain, protocol, screen } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import path from 'path'
import fs from 'fs-extra'
import { IPC_CHANNELS } from '@citadel-app/core';
import { mainModuleRegistry } from './main-module-registry';
import { setupMacOSMenu } from './menu-utils';

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

let ttsPort = 5050;
let qdrantPort = 6333;

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






  // appSettings already initialized



  // Find available ports for background services





  // Initialize module IPC router and load modules
  mainModuleRegistry.init();
  const workspaceContext = initialWorkspacePath ? {
      path: initialWorkspacePath,
      configDir: path.join(initialWorkspacePath, '.codex', 'config')
  } : null;

  import('../../packages/modules/base/src/main/index').then(({ activateMain }) => {
      const baseMainModule = {
          id: '@citadel-app/base',
          version: '1.0.0',
          onMainActivate: activateMain
      };
      mainModuleRegistry.loadModules([baseMainModule], workspaceContext);
  });


  // Load Code Module
  // @ts-ignore
  import('../../packages/modules/code/src/main/index').then(({ activateMain }) => {
      const codeMainModule = {
          id: '@citadel-app/code',
          version: '1.0.0',
          onMainActivate: activateMain
      };
      mainModuleRegistry.loadModules([codeMainModule], workspaceContext);
  });

  // Clean up on exit
  let isQuitting = false;
  app.on('before-quit', async (_event) => {
      if (isQuitting) return;
      isQuitting = true;
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
           // Base Module observes changes via ModuleRegistry now
           return true;
       }
       return false;
  })

  ipcMain.handle(IPC_CHANNELS.WINDOW_SET_ZOOM, (event, zoomFactor: number) => {
    const webContents = event.sender;
    const currentZoom = webContents.getZoomFactor();
    // Only set if difference is significant to avoid redundant event triggers
    if (Math.abs(currentZoom - zoomFactor) > 0.001) {
        webContents.setZoomFactor(zoomFactor);
    }
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
        /* Validation delegated to Base Module or inherently safe if inside workspacePath */
        
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
