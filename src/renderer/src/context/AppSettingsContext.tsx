import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useTheme } from 'next-themes';
import { THEMES, getThemeById } from '../lib/themes';
import { providerRegistry } from '../ai/providers/ProviderRegistry';

interface AppSettings {
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
    rssRefreshInterval: number; // in milliseconds (0 = disabled)
    youtubeRefreshInterval: number; // in milliseconds (0 = disabled)
    feedRefreshBatchSize: number; // number of feeds to update in state at once

    // PeerJS settings
    peerEnabled: boolean;
    peerId: string;
    peerIceServers: { urls: string }[];
    [key: string]: any;
}

interface AppSettingsContextType {
    settings: AppSettings;
    isLoading: boolean;
    updateSetting: (key: string, value: any) => Promise<void>;
    updateSettings: (settings: Partial<AppSettings>) => Promise<void>;
}

const AppSettingsContext = createContext<AppSettingsContextType | null>(null);

export const useAppSettings = () => {
    const context = useContext(AppSettingsContext);
    if (!context) {
        throw new Error('useAppSettings must be used within a AppSettingsProvider');
    }
    return context;
};

interface AppSettingsProviderProps {
    children: ReactNode;
}

const DEFAULT_APP_SETTINGS: AppSettings = {
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
    rssRefreshInterval: 7200000, // 2 hours
    youtubeRefreshInterval: 7200000, // 2 hours
    feedRefreshBatchSize: 5,
    peerEnabled: false,
    peerId: '', // Will be filled by main process
    peerIceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
};

export const AppSettingsProvider = ({ children }: AppSettingsProviderProps) => {
    const { setTheme: setNextTheme } = useTheme();
    const [settings, setSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadSettings();
    }, []);

    // Sync theme mode (light/dark/system)
    useEffect(() => {
        if (settings.theme) {
            setNextTheme(settings.theme);
        }
    }, [settings.theme, setNextTheme]);

    // Apply color theme variables
    const { resolvedTheme } = useTheme();
    useEffect(() => {
        const themeDef = getThemeById(settings.colorTheme || 'vscode');
        const mode = resolvedTheme === 'dark' ? 'dark' : 'light';
        const vars = themeDef[mode];

        const root = document.documentElement;
        root.style.setProperty('--primary', vars.primary);
        root.style.setProperty('--primary-foreground', vars.primaryForeground);
        root.style.setProperty('--primary-rgb', vars.primaryRgb);
        root.style.setProperty('--ring', vars.primary); // Matching ring to primary

        console.log(`[AppSettings] Applied color theme: ${themeDef.name} (${mode})`);
    }, [settings.colorTheme, resolvedTheme]);

    // Apply zoom factor
    useEffect(() => {
        if (window.api?.window?.setZoom) {
            window.api.window.setZoom(settings.zoomFactor || 1.0);
        }
    }, [settings.zoomFactor]);

    const loadSettings = async () => {
        try {
            if (!window.api?.appSettings) {
                console.warn('[AppSettingsContext] window.api.appSettings is not defined. Restart the app if you just added this feature.');
                return;
            }
            const loaded = await window.api.appSettings.getSettings();

            // Merge loaded settings with defaults
            const mergedSettings = { ...DEFAULT_APP_SETTINGS, ...loaded };

            if (loaded.executionEnvironments) {
                mergedSettings.executionEnvironments = {
                    ...DEFAULT_APP_SETTINGS.executionEnvironments,
                    ...loaded.executionEnvironments
                };
            }

            setSettings(mergedSettings);

            // Configure AI provider registry
            providerRegistry.configure(mergedSettings);
        } catch (error) {
            console.error('Failed to load app settings:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const updateSetting = async (key: string, value: any) => {
        try {
            const updated = await window.api.appSettings.updateSetting(key, value);
            setSettings(prev => ({ ...prev, ...updated }));

            // Re-configure providers when AI settings change
            if (key === 'ai') {
                providerRegistry.configure({ ...settings, [key]: value });
            }
        } catch (error) {
            console.error('Failed to update app setting:', error);
            // Optimistic update fallback? For now just log error.
        }
    };

    const updateSettings = async (newSettings: Partial<AppSettings>) => {
        try {
            const updated = await window.api.appSettings.updateSettings(newSettings);
            setSettings(prev => ({ ...prev, ...updated }));
        } catch (error) {
            console.error('Failed to update app settings:', error);
        }
    };

    return (
        <AppSettingsContext.Provider value={{ settings, isLoading, updateSetting, updateSettings }}>
            {children}
        </AppSettingsContext.Provider>
    );
};
