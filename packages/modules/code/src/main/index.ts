import { IModule, MainRegistrar, WorkspaceContext } from '@citadel-app/core';
import { app, BrowserWindow } from 'electron';
import * as http from 'http';
import { LspServer } from './lsp/LspServer';
import { DockerReplService } from './services/DockerReplService';
import { ExecutionSidecar } from './sidecars/ExecutionSidecar';
import { registerLatexHandlers } from './latex-compiler';
import * as net from 'net';

function findAvailablePort(startPort: number): Promise<number> {
    return new Promise((resolve, reject) => {
        const server = net.createServer();
        server.unref();
        server.on('error', (e: any) => {
            if (e.code === 'EADDRINUSE') {
                resolve(findAvailablePort(startPort + 1));
            } else {
                reject(e);
            }
        });
        server.listen(startPort, () => {
            const addr = server.address();
            const port = typeof addr === 'string' ? startPort : addr?.port || startPort;
            server.close(() => resolve(port));
        });
    });
}

export const CodeMainModule: IModule = {
    id: '@citadel-app/code',
    version: '1.1.0',
    ipcs: [
        "kernel.start", "kernel.execute", "kernel.stop", "kernel.status",
        "latex:check", "latex:compile",
        "code.execution.start", "code.execution.stop", "code.execution.status",
        "repl:start-session", "repl:stop-session", "repl:list-containers", "repl:stop-container",
        "repl:remove-container", "repl:check-session", "repl:send-input", "getLspPort"
    ],
    onMainActivate: async (registrar: MainRegistrar, _workspace: WorkspaceContext | null) => {
        console.log('[CodeModule/Main] Activating Code module services');

        const dockerReplService = new DockerReplService();

        // 0. Setup Execution Sidecar
        const executionSidecar = new ExecutionSidecar();
        if ((registrar as any).registerSidecar) {
            (registrar as any).registerSidecar(executionSidecar);
        }

        registrar.handle('code.execution.start', async () => await (executionSidecar as any).start());
        registrar.handle('code.execution.stop', async () => await (executionSidecar as any).stop());
        registrar.handle('code.execution.status', async () => (executionSidecar as any).status);

        // 1. Setup Docker REPL IPC
        registrar.handle('repl:start-session', async (...args: any[]) => dockerReplService.startSession(args[0]));
        registrar.handle('repl:stop-session', async (...args: any[]) => dockerReplService.stopSession(args[0]));
        registrar.handle('repl:list-containers', async () => dockerReplService.listContainers());
        registrar.handle('repl:stop-container', async (...args: any[]) => dockerReplService.stopContainer(args[0]));
        registrar.handle('repl:remove-container', async (...args: any[]) => dockerReplService.removeContainer(args[0]));
        registrar.handle('repl:check-session', async (...args: any[]) => dockerReplService.isSessionRunning(args[0]));
        registrar.handle('repl:send-input', async (...args: any[]) => dockerReplService.sendInput(args[0], args[1]));

        dockerReplService.on('output', ({ sessionId, data }) => {
            BrowserWindow.getAllWindows().forEach(win => {
                win.webContents.send('module:repl:output', { sessionId, data });
            });
        });

        dockerReplService.on('closed', ({ sessionId, code }) => {
            BrowserWindow.getAllWindows().forEach(win => {
                win.webContents.send('module:repl:closed', { sessionId, code });
            });
        });

        // 2. Setup LaTeX
        registerLatexHandlers(registrar);

        // 3. Setup LSP Server
        let lspPort = 3000;
        try {
            lspPort = await findAvailablePort(3000);
            console.log(`[CodeModule/Main] LSP Port allocated: ${lspPort}`);

            const lspServer = http.createServer((_req, res) => {
                res.writeHead(404);
                res.end();
            });
            new LspServer(lspServer);
            lspServer.on('error', (err: any) => {
                console.error(`[CodeModule/Main] LSP Server error: ${err.message}`);
            });

            lspServer.listen(lspPort, () => {
                console.log(`[CodeModule/Main] LSP Server listening on port ${lspPort}`);
            });

            app.on('before-quit', () => lspServer.close());
        } catch (e) {
            console.error(`[CodeModule/Main] Failed to start LSP server:`, e);
        }

        // Export port for frontend
        registrar.handle('getLspPort', () => lspPort);

        // 4. Cleanup
        app.on('before-quit', async () => {
            await dockerReplService.cleanupAll();
        });
    }
};
