
import { MonacoLanguageClient } from 'monaco-languageclient';
import { CloseAction, ErrorAction, MessageTransports } from 'vscode-languageclient';
import { WebSocketMessageReader, WebSocketMessageWriter, toSocket } from 'vscode-ws-jsonrpc';
import { Uri } from 'monaco-editor';
import * as monaco from 'monaco-editor';

export function createLanguageClient(transports: MessageTransports): MonacoLanguageClient {
    return new MonacoLanguageClient({
        name: 'Codex Language Client',
        clientOptions: {
            // use a language id as a root uri
            documentSelector: ['python', 'java', 'javascript', 'typescript'], // extend as needed
            // disable the default error handler
            errorHandler: {
                error: () => ({ action: ErrorAction.Continue }),
                closed: () => ({ action: CloseAction.DoNotRestart })
            }
        },
        messageTransports: transports
    });
}

export function createUrl(hostname: string, port: number, path: string): string {
    const protocol = location.protocol === 'https:' ? 'wss' : 'ws';
    return `${protocol}://${hostname}:${port}${path}`;
}

export function initLSP(language: string, command: string): { dispose: () => void } {
    let client: MonacoLanguageClient | null = null;
    let webSocket: WebSocket | null = null;

    const url = createUrl('localhost', 3000, `/lsp?lang=${language}&command=${encodeURIComponent(command)}`);
    webSocket = new WebSocket(url);

    webSocket.onopen = () => {
        const socket = toSocket(webSocket!);
        const reader = new WebSocketMessageReader(socket);
        const writer = new WebSocketMessageWriter(socket);
        client = createLanguageClient({ reader, writer });
        client.start();
        console.log(`[LSP Client] Started for ${language}`);
        
        reader.onClose(() => client?.stop());
    };
    
    webSocket.onerror = (e) => {
        console.error(`[LSP Client] WebSocket error for ${language}:`, e);
    };

    return {
        dispose: () => {
            if (client) {
                client.stop();
            }
            if (webSocket) {
                webSocket.close();
            }
        }
    };
}
