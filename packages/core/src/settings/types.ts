export interface AppSettings {
    theme: string;
    locale: string;
    autoSave: boolean;
    autoSaveInterval: number; // in milliseconds
    autoCommitEnabled: boolean;
    autoCommitInterval: number; // in milliseconds
    autoCommitMessage: string;
    developerMode: boolean;
    defaultRemote: string;
    defaultBranch: string;
    gitPollingEnabled: boolean;
    gitPollingInterval: number; // in milliseconds
    // RAG Indexing settings
    ragIndexingEnabled: boolean;
    ragReindexInterval: number; // hours - how often to auto-reindex (0 = manual only)
    ragAutoIndexOnAction: boolean; // auto-index when using AI actions like Summarize
    // Text chunking settings
    ragChunkSize: number; // characters per chunk
    ragChunkOverlap: number; // overlap between chunks
    // Content source toggles
    ragIndexPdf: boolean;
    ragIndexUrl: boolean;
    ragIndexMarkdown: boolean;
    // AI generation settings
    aiTemperature: number; // 0.0-1.0, lower = more deterministic
    // Background indexing settings
    backgroundIndexingEnabled: boolean;
    backgroundIndexingInterval: number; // minutes between indexing runs
    backgroundIndexingBatchSize: number; // entries per run
    ragFolderWhitelist: string[]; // folders allowed to be indexed
    ttsUrl: string;
    // Execution settings
    executionEnvironments: Record<string, {
        image: string;
        command: string; // e.g. "python /code/script.py"
        extension: string; // e.g. "py"
        snippet?: string; // Default code snippet
        lspCommand?: string; // e.g. "pylsp" or "gopls"
    }>;
    zenMode: boolean;
    ttsDataPath: string | null;
    qdrantDataPath: string | null;
    colorTheme: string;
    zoomFactor: number;

    // PeerJS settings
    peerEnabled: boolean;
    peerId: string;
    peerIceServers: { urls: string }[];
    [key: string]: any;
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
    theme: 'system',
    locale: 'en-US',
    autoSave: false,
    autoSaveInterval: 300000,
    autoCommitEnabled: false,
    autoCommitInterval: 300000,
    autoCommitMessage: "Auto-commit: {{ 'now' | date: '%Y-%m-%d %H:%M:%S' }}",
    developerMode: false,
    defaultRemote: 'origin',
    defaultBranch: 'main',
    gitPollingEnabled: true,
    gitPollingInterval: 10000,
    ragIndexingEnabled: true,
    ragReindexInterval: 24,
    ragAutoIndexOnAction: true,
    ragChunkSize: 1000,
    ragChunkOverlap: 100,
    ragIndexPdf: true,
    ragIndexUrl: true,
    ragIndexMarkdown: true,
    aiTemperature: 0.7,
    backgroundIndexingEnabled: true,
    backgroundIndexingInterval: 5,
    backgroundIndexingBatchSize: 10,
    ragFolderWhitelist: [],
    ttsUrl: 'http://localhost:5050',
    ttsEnabled: false,
    executionUrl: 'http://localhost:5051',
    executionEnvironments: {
        python: {
            image: 'python:3.9-slim',
            command: 'python /code/script.py',
            extension: 'py',
            snippet: 'print("Hello from Python!")',
            lspCommand: 'pylsp'
        },
        javascript: {
            image: 'node:18-alpine',
            command: 'node /code/script.js',
            extension: 'js',
            snippet: 'console.log("Hello from JavaScript!");'
        },
        typescript: {
            image: 'oven/bun:1',
            command: 'bun run /code/script.ts',
            extension: 'ts',
            snippet: 'console.log("Hello from TypeScript!");'
        },
        java: {
            image: 'eclipse-temurin:17-jdk-alpine',
            command: 'javac /code/script.java && java -cp /code script',
            extension: 'java',
            snippet: 'public class script {\n    public static void main(String[] args) {\n        System.out.println("Hello from Java!");\n    }\n}'
        },
        cpp: {
            image: 'gcc:latest',
            command: 'g++ -o /code/a.out /code/script.cpp && /code/a.out',
            extension: 'cpp',
            snippet: '#include <iostream>\n\nint main() {\n    std::cout << "Hello from C++!" << std::endl;\n    return 0;\n}'
        },
        c: {
            image: 'gcc:latest',
            command: 'gcc -o /code/a.out /code/script.c && /code/a.out',
            extension: 'c',
            snippet: '#include <stdio.h>\n\nint main() {\n    printf("Hello from C!\\n");\n    return 0;\n}'
        },
        go: {
            image: 'golang:1.19-alpine',
            command: 'go run /code/script.go',
            extension: 'go',
            snippet: 'package main\n\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Hello from Go!")\n}'
        },
        rust: {
            image: 'rust:1.67-alpine',
            command: 'rustc -o /code/a.out /code/script.rs && /code/a.out',
            extension: 'rs',
            snippet: 'fn main() {\n    println!("Hello from Rust!");\n}'
        },
        php: {
            image: 'php:8.2-cli-alpine',
            command: 'php /code/script.php',
            extension: 'php',
            snippet: '<?php\necho "Hello from PHP!";\n?>'
        },
        ruby: {
            image: 'ruby:3.2-alpine',
            command: 'ruby /code/script.rb',
            extension: 'rb',
            snippet: 'puts "Hello from Ruby!"'
        },
        zig: {
            image: 'ziglings/ziglang:latest',
            command: 'zig run /code/script.zig',
            extension: 'zig',
            snippet: 'const std = @import("std");\n\npub fn main() void {\n    std.debug.print("Hello from Zig!\\n", .{});\n}'
        },
        csharp: {
            image: 'mcr.microsoft.com/dotnet/sdk:latest',
            command: 'mkdir -p /tmp/project && cd /tmp/project && dotnet new console --force > /dev/null && cp /code/script.cs Program.cs && dotnet run',
            extension: 'cs',
            snippet: 'using System;\n\nclass Program {\n    static void Main() {\n        Console.WriteLine("Hello from C#!");\n    }\n}'
        }
    },
    zenMode: false,
    ttsDataPath: null,
    qdrantDataPath: null,
    colorTheme: 'vscode',
    zoomFactor: 1.0,
    peerEnabled: false,
    peerId: '', // Will be filled by main process
    peerIceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    ai: {
        enabled: false,
        provider: 'ollama',
        ollama: {
            baseUrl: 'http://localhost:11434',
            model: 'llama3'
        },
        openai: {
            apiKey: '',
            model: 'gpt-4o-mini'
        },
        gemini: {
            apiKey: '',
            model: 'gemini-2.0-flash'
        }
    }
};
