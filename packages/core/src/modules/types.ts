// Core types for the modular plugin architecture.

import type { AppSettings } from '../settings/types';
import type { WorkspaceConfig, ModuleDefinition } from '../codex/entry-types';
import type { CodexEntry } from '../codex/types';
import type { AppCommand } from '../commands/types';
import type { ModuleAPIRegistry } from './ipc-types';


// ---------------------------------------------------------------------------
// Storage Provider — generic file I/O primitives for modules.
// Modules use this to build their own data persistence layer
// instead of importing the app's monolithic dataManager.
// All paths are relative to the workspace root.
// ---------------------------------------------------------------------------

export interface StorageProvider {
    /** Read and parse a JSON file. Returns null if file doesn't exist. */
    readJSON: <T = unknown>(relativePath: string) => Promise<T | null>;

    /** Write a JSON file (creates parent dirs if needed). */
    writeJSON: <T = unknown>(relativePath: string, data: T) => Promise<void>;

    /** Read a file as a raw string. Returns null if file doesn't exist. */
    readFile: (relativePath: string) => Promise<string | null>;

    /** Write a raw string to a file. */
    writeFile: (relativePath: string, content: string) => Promise<void>;

    /** Check if a file or directory exists. */
    exists: (relativePath: string) => Promise<boolean>;

    /** Subscribe to data change events from the workspace. Returns unsubscribe fn. */
    subscribe: (callback: (event: string, data: any) => void) => () => void;
}

// ---------------------------------------------------------------------------
// Feed DB — SQLite-backed feed item caching for modules.
// Abstracts `window.api.db.*` so modules don't couple to Electron IPC.
// ---------------------------------------------------------------------------

export interface FeedDB {
    /** Get read/link status for all feed items. */
    getFeedStatus: () => Promise<Record<string, any>>;

    /** Get cached feed items for a specific feed. */
    getFeedItems: (feedId: string, limit?: number) => Promise<any[]>;

    /** Save feed items to the cache for a specific feed. */
    saveFeedItems: (feedId: string, items: any[]) => Promise<void>;

    /** Update status (read, relatedEntries) for a single feed item. */
    updateFeedStatus: (itemId: string, status: any) => Promise<void>;
}

// ---------------------------------------------------------------------------
// Core Services — the contract between the app shell and modules.
// Defined here (types-only, no React) so both core and ui can reference it.
// The React context + hook live in @citadel-app/ui.
// ---------------------------------------------------------------------------

/**
 * Core services that the app shell provides to all modules.
 * Modules access these via `useCoreServices()` from `@citadel-app/ui`
 * instead of importing host-internal providers.
 */
export interface CoreServices {
    /** Current workspace path (null when no workspace is open). */
    vaultPath: string | null;

    /** Workspace configuration (entry types, presets, etc.). */
    config: WorkspaceConfig;

    /** Global application settings (theme, AI config, zoom, etc.). */
    settings: AppSettings;

    /** Show a toast notification. */
    toast: (message: string, options?: {
        type?: 'success' | 'error' | 'info' | 'warning';
        duration?: number;
    }) => void;

    /** File I/O primitives for module-owned data persistence. */
    storage: StorageProvider;

    /** SQLite-backed feed item caching. */
    feedDb: FeedDB;

    /** Remove related links from entries that reference the given IDs. */
    removeRelatedLinks: (targetIds: string[], linkType: string) => Promise<void>;

    /** Global command registry for cross-module command registration. */
    commandRegistry?: {
        getCommands: () => AppCommand[];
        register: (command: AppCommand) => () => void;
        execute: (id: string, context?: any) => Promise<void>;
        search: (query: string) => AppCommand[];
        subscribe: (listener: (commands: AppCommand[]) => void) => () => void;
    };

    /** Provides modules a bounded context for creating unified application entries without depending on the app's internal DB cache logic. */
    createLocalEntry?: (data: Partial<Omit<CodexEntry, 'createdAt' | 'updatedAt'>>) => Promise<CodexEntry>;

    /** Provide available UI modules registered by all system plugins */
    getPluginModules: () => ModuleDefinition[];

    /**
     * Write a single key back to AppSettings.
     * Module-owned keys (e.g. rssRefreshInterval) are stored via the generic index signature.
     */
    updateSetting: (key: string, value: any) => void;

    /** UNSAFE: Direct access to host globals. To be refactored into proper StorageProvider methods later. */
    db?: any;
    dataManager?: any;
    hostApi?: any;
}

// ---------------------------------------------------------------------------
// Provider Registration — modules declare providers and their scope.
// ---------------------------------------------------------------------------

export interface ProviderRegistration {
    /** Unique identifier for this provider (e.g. 'rss', 'youtube-player'). */
    id: string;

    /** 'global' = wraps the entire app, 'route' = wraps specific routes only. */
    scope: 'global' | 'route';

    /** Routes this provider wraps (only used when scope = 'route'). */
    routes?: string[];

    /** Ordering weight: lower = closer to root. Default: 100. */
    priority?: number;
}

// ---------------------------------------------------------------------------
// Registrars — lifecycle hooks for module activation.
// ---------------------------------------------------------------------------

export interface LinkSearchProvider {
    id: string;
    label: string;
    search: (query: string) => Promise<{ id: string; type: string; title: string; url?: string; description?: string; metadata?: any }[]>;
}

export interface CrossLinkHandler {
    id: string;
    handleLinkCompleted: (
        targetList: { id: string; type: string; title: string }[], 
        sourceLink: { id: string; type: string; title: string; url?: string }, 
        extraData?: any
    ) => Promise<void>;
}

export interface NavigationItem {
    id: string;
    label: string;
    path: string;
    icon: string;
    activeClass?: string;
    inactiveClass?: string;
    priority?: number; 
}

export interface SidebarItem {
    id: string;
    label: string;
    path: string;
    icon: string;
    group?: 'top' | 'bottom'; // Defaults to 'top' if not specified
    priority?: number;
    badge?: number;
    tourId?: string;
}

/**
 * A settings panel contributed by a module.
 * Rendered as a tab inside the host SettingsPage.
 */
export interface SettingsPanel {
    id: string;
    title: string;
    icon?: string;
    /** React component rendered as the tab body. Receives no props — module owns its own state. */
    component: any;
    /** Optional priority for ordering tabs (lower = earlier). Defaults to 100. */
    priority?: number;
}

/**
 * Describes an external data type that modules contribute to the entry lifecycle.
 * The data-manager uses registered handlers instead of hardcoded field destructuring.
 */
export interface ExternalDataHandler {
    /** Field name on the entry object (e.g. 'whiteboard', 'highlights', 'code') */
    type: string;
    /** Frontmatter key that stores the external file ID (e.g. 'whiteboardId') */
    frontmatterKey: string;
    /** Subdirectory under the entry folder for external files (e.g. 'board') */
    dir: string;
}

export interface RendererRegistrar {
    registerRoute: (path: string, component: any) => void;
    registerIcon: (name: string, icon: any) => void;
    registerCommand?: (command: any) => void;

    /**
     * Register a React provider component at the specified scope.
     * The component must accept `{ children: any }`.
     */
    registerProvider: (entry: ProviderRegistration, component: any) => void;

    /** Hook a component into a generic region slot (e.g., 'global-overlay') */
    registerGlobalComponent: (region: string, component: any) => void;
    
    /** Register an arbitrary component accessible by ID */
    registerComponent: (id: string, component: any) => void;
    
    /** Provide cross-module link search capability to the Link Dialog */
    registerLinkSearchProvider: (provider: LinkSearchProvider) => void;
    
    /** Handle callbacks when a link pointing to this module is created. */
    registerCrossLinkHandler: (handler: CrossLinkHandler) => void;

    /** Provide a navigation button for the TitleBar */
    registerNavigationItem: (item: NavigationItem) => void;

    /** Provide a navigation button for the Sidebar (Activity Bar) */
    registerSidebarItem: (item: SidebarItem) => void;

    /** Inject a settings tab into the host SettingsPage */
    registerSettingsPanel: (panel: SettingsPanel) => void;

    /** Register a content-viewer component for a specific entry type (e.g. 'whiteboard', 'pdf') */
    registerContentViewer: (entryType: string, component: any) => void;

    /** Register an inline section editor for a specific section type (e.g. 'whiteboard') */
    registerSectionEditor: (sectionType: string, component: any) => void;

    /** Register an external data handler for entry lifecycle (create/update/delete). */
    registerExternalDataHandler: (handler: ExternalDataHandler) => void;

    /** Register a status widget to be rendered on the System Status page */
    registerStatusWidget: (id: string, group: string, component: any) => void;
}

// ---------------------------------------------------------------------------
// Workspace Context — passed to main-process modules during activation.
// Modules hold this reference for workspace-scoped operations.
// ---------------------------------------------------------------------------

export interface WorkspaceContext {
    /** Absolute path to the workspace root */
    path: string;
    /** Path to .codex/config/ — modules store their data here */
    configDir: string;
}

type ValidIPC<T> = T extends (...args: any[]) => any ? T : never;

export interface MainRegistrar<M extends keyof ModuleAPIRegistry = any> {
    /** 
     * Register a module-scoped IPC handler (callable via module:invoke).
     * Strongly typed to ensure modules only register endpoints they've declared in their API interface.
     */
    handle<K extends keyof ModuleAPIRegistry[M]>(
        method: K, 
        handler: (...args: Parameters<ValidIPC<ModuleAPIRegistry[M][K]>>) => ReturnType<ValidIPC<ModuleAPIRegistry[M][K]>> | Promise<Awaited<ReturnType<ValidIPC<ModuleAPIRegistry[M][K]>>>>
    ): void;
}

export interface IModule {
    id: string;
    version: string;

    /**
     * Declare which window.api methods this module requires.
     * Only declared methods will be accessible via the scoped API proxy.
     * Format: 'namespace.method' (e.g. 'net.fetch', 'db.getFeedItems')
     */
    permissions?: {
        ipc: string[];
    };
    
    // --- Declarative UI Registrations ---
    // Instead of calling registrar methods imperatively in onRendererActivate,
    // modules can simply export these arrays/objects to be automatically loaded.

    contentModules?: Record<string, ModuleDefinition>;

    contentViewers?: Record<string, any>; // Entry Type (e.g. 'pdf') -> React Component
    sectionEditors?: Record<string, any>; // Section Type (e.g. 'whiteboard') -> React Component
    settingsPanels?: SettingsPanel[];
    statusWidgets?: { id: string; group: string; component: any }[];
    globalComponents?: { region: string; component: any }[];
    routes?: { path: string; component: any }[];
    sidebarItems?: SidebarItem[];
    navigationItems?: NavigationItem[];
    providers?: { entry: ProviderRegistration; component: any }[];
    linkSearchProviders?: LinkSearchProvider[];
    crossLinkHandlers?: CrossLinkHandler[];
    externalDataHandlers?: ExternalDataHandler[];

    // --- Lifecycle Hooks ---

    // Lifecycle hook for the main process (Node.js)
    // workspace is null if no workspace is selected yet
    onMainActivate?: (registrar: MainRegistrar, workspace: WorkspaceContext | null) => Promise<void>;
    
    /** Called when workspace changes — modules reinitialize their data stores */
    onWorkspaceChanged?: (workspace: WorkspaceContext) => Promise<void>;
    
    // Lifecycle hook for the renderer process (Browser)
    onRendererActivate?: (registrar: RendererRegistrar, api: ScopedAPI) => Promise<void>;
}

/**
 * A sandboxed wrapper enforcing strictly-typed module.invoke capability.
 * Module actions are validated against the `IModule.permissions.ipc` map.
 */
export interface ScopedAPI {
    invoke<M extends keyof ModuleAPIRegistry, K extends keyof ModuleAPIRegistry[M]>(
        moduleId: M,
        method: K,
        ...args: Parameters<ValidIPC<ModuleAPIRegistry[M][K]>>
    ): Promise<Awaited<ReturnType<ValidIPC<ModuleAPIRegistry[M][K]>>>>;
    // Basic events mapping
    on: (channel: string, callback: (...args: any[]) => void) => () => void;
}
