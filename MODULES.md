# Citadel Module System

This document describes how modules work in Citadel: how to create one, what it can contribute, and how the host app wires everything together.

---

## Overview

The module system gives self-contained packages the ability to extend the Citadel shell without touching host application code. Each module is an object that implements `IModule` and contributes features through a set of well-defined declarative fields and extension points during its activation lifecycle.

Current production modules include `@citadel-app/base`, `@citadel-app/code`, `@citadel-app/pdf`, `@citadel-app/excalidraw`, and `@citadel-app/rss`. The system is designed to support any number of independent modules.

---

## Anatomy of a Module

A module is a plain TypeScript object that satisfies `IModule` from `@citadel-app/core`:

```ts
import type { IModule, RendererRegistrar, MainRegistrar, WorkspaceContext, ScopedAPI } from '@citadel-app/core';

export const MyModule: IModule = {
    id: '@myorg/my-module',
    version: '1.0.1',

    // Strict scoping for host API capabilities
    permissions: {
        ipc: ['fs.readFile']
    },

    // Declarative UI Contributions
    contentModules: {
        myviewer: { id: 'myviewer', label: 'My Viewer', requirements: [] }
    },
    contentViewers: {
        mytype: lazy(() => import('./Viewer'))
    },
    routes: [
        { path: '/my-page', component: MyPage }
    ],

    // Runs in the Electron main process (Node.js)
    // Strongly typed against ModuleAPIRegistry to enforce return signatures
    async onMainActivate(registrar: MainRegistrar<'@myorg/my-module'>, workspace: WorkspaceContext | null) {
        // workspace is null during welcome/builder flow — use in-memory storage
        // workspace.configDir = .codex/config/ when available
        registrar.handle('getData', async (payload) => {
            return { data: true };
        });
    },

    // Called when workspace switches (optional)
    async onWorkspaceChanged(workspace: WorkspaceContext) {
        // Reinitialize data stores with new workspace path
    },

    // Runs in the renderer process (React)
    async onRendererActivate(registrar: RendererRegistrar, api: ScopedAPI) {
        // 'api' is a sandboxed proxy — only declared IPC methods work
        // Use 'registrar' for manual extension points if declarative fields don't suffice
    }
};
```

All lifecycle hooks are optional. A data-only module can implement just `onMainActivate`; a pure-UI module can implement just declarative fields and `onRendererActivate`.

---

## Entry Types vs. Content Modules

**Critical Architectural Rule:** Modules **DO NOT** dictate `entryTypes`.

Entry Types (like `problem`, `design`, `paper`) belong purely to the user's Workspace configuration (`config.entries` in `.codex/workspace.json`).

Modules provide `contentModules` (like `pdf`, `whiteboard`, `code`) and register `contentViewers` and `sectionEditors` to fulfill the rendering requirements of those entry types. The workspace config declaratively binds an Entry Type's layout to a specific content module.

---

## IPC Permissions & Security

Security is enforced through **three layers**: API capture/revoke, per-module IPC permission checking, and filesystem guardrails.

### Layer 1 — API Vault (Capture & Revoke)

1. `api-vault.ts` captures `window.citadel` into a private closure at boot, then **deletes** it from the global scope.
2. Host code imports `__hostApi` from `api-vault.ts` for full, ungated IPC access.
3. `window.citadel` is sealed — any access returns `undefined`.
4. Modules **cannot** access the raw API; they receive a `ScopedAPI` proxy instead.

### Layer 2 — ScopedAPI (IPC Permission Checking)

Each module receives a `ScopedAPI` proxy during `onRendererActivate`. Only methods listed in `permissions.ipc` are forwarded to the real API.

#### Declaring permissions

```ts
permissions: {
    ipc: [
        'net.fetch',                        // namespace.method format
        'fs.readFile',                      // file system access
        'module.invoke:@citadel-app/ai'         // cross-module invocation (scoped)
    ]
}
```

> **Self-invocation is always allowed.** A module can call its own `module:invoke` handlers without any permission.

#### CoreServices respects IPC permissions

`useCoreServices()` gives modules access to `storage`, `feedDb`, `updateSetting`, etc. These are **not** a bypass — each module's CoreServices is backed by its own `ScopedAPI`, meaning the underlying IPC functions (like `storage.readFile`) are intercepted and permission-checked.

### Layer 3 — GuardrailService (Filesystem Boundaries)

In the main process, `GuardrailService` ensures IPC handlers can only access paths within the Active workspace or globally permitted System paths (e.g., `downloads`, `tmpdir`).

---

## Extension Points & Declarative UI

Instead of imperatively calling registrar methods, modules generally define features using declarative arrays/objects on `IModule`. The `appModuleRegistry` parses these globally on initialization.

### 1. Routes and Sidebar Items
Add pages to the React Router tree and place icons in the Activity Bar.
```ts
routes: [{ path: '/my-page', component: MyPage }],
sidebarItems: [{ id: 'my-sidebar', label: 'My Page', path: '/my-page', icon: 'Star' }]
```

### 2. Settings Panels
Inject a full settings tab into the primary `SettingsPage`.
```ts
settingsPanels: [{ id: 'my-settings', title: 'My Module', component: MySettings }]
```

### 3. Global Providers & Components
Wrap the application in providers or inject persistent floating UI tokens.
```ts
providers: [{ entry: { id: 'my-provider', scope: 'global' }, component: MyProvider }],
globalComponents: [{ region: 'global-overlay', component: FloatingPlayer }]
```

### 4. Search and Handlers
Hook into Link generation and bi-directional resolution:
```ts
linkSearchProviders: [ ... ]
crossLinkHandlers: [ ... ]
externalDataHandlers: [ ... ]
```

---

## Strictly-Typed IPC Handlers (Main Process)

Modules register backend handlers via `registrar.handle()` in `onMainActivate`. These run in Node.js and are callable from the renderer through the `module:invoke` proxy.

#### Registering handlers safely

The `MainRegistrar` is strongly typed via a generic bound to `ModuleAPIRegistry` in `@citadel-app/core/modules/ipc-types.ts`. A module must first document its external contract in the registry.

```ts
// 1. In @citadel-app/core/modules/ipc-types.ts:
export interface ModuleAPIRegistry {
    '@myorg/my-module': {
        getData: (id: string) => Promise<{ success: boolean; data: any }>;
    };
}

// 2. In Main process code:
async onMainActivate(registrar: MainRegistrar<'@myorg/my-module'>) {
    // Type-safe! The compiler enforces the exact parameters and Promise return type.
    registrar.handle('getData', async (id) => {
        return { success: true, data: fetchMyData(id) };
    });
}
```

#### Calling from renderer

The renderer calls module handlers through the injected proxy API:

```ts
// Using CoreServices (Standard Module behavior):
const api = useCoreServices().hostApi; // Inherently scoped to caller module
const result = await api.module.invoke('@myorg/my-module', 'getData', '123');
```

Handlers are completely wiped and rebuilt on demand whenever a user switches active Workspaces.
