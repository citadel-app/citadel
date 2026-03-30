import React from 'react'
import {
  IModule,
  RendererRegistrar,
  ProviderRegistration,
  LinkSearchProvider,
  CrossLinkHandler,
  NavigationItem,
  SidebarItem,
  PluginSettingsSchema,
  SettingsPanel,
  ScopedAPI,
  CoreServices,
  ExternalDataHandler,
  ModuleDefinition,
  SectionTemplate
} from '@citadel-app/core'
import { __hostApi } from './api-vault'
import { CoreServicesContext } from '@citadel-app/ui'
import { buildStorage, buildFeedDb, type CoreServicesAPI } from './core-services-factory'

/**
 * Creates a sandboxed API proxy for a module.
 * Only methods listed in `allowedMethods` are forwarded to the real API.
 *
 * Special handling for module.invoke:
 *   - Self-invocation (calling own module's handlers) is always allowed
 *   - Cross-module invocation requires 'module.invoke:@targetModuleId' permission
 */
function createScopedApi(moduleId: string, allowedMethods: string[]): ScopedAPI {
  const byNamespace = new Map<string, Set<string>>()
  // Collect cross-module invoke permissions (e.g. 'module.invoke:@citadel-app/ai')
  const crossModulePerms = new Set<string>()

  for (const method of allowedMethods) {
    // Handle 'module.invoke:@scope/name' format for cross-module permissions
    if (method.startsWith('module.invoke:')) {
      crossModulePerms.add(method.substring('module.invoke:'.length))
      continue
    }
    const [ns, fn] = method.split('.')
    if (!ns || !fn) {
      console.warn(
        `[ModuleRegistry] Invalid permission format: "${method}". Expected "namespace.method".`
      )
      continue
    }
    // Skip 'module.invoke' — handled specially below
    if (ns === 'module' && fn === 'invoke') continue
    if (!byNamespace.has(ns)) byNamespace.set(ns, new Set())
    byNamespace.get(ns)!.add(fn)
  }

  // Build per-namespace proxies
  const scoped: any = {}
  for (const [ns, fns] of byNamespace) {
    scoped[ns] = new Proxy({} as any, {
      get(_: any, prop: string) {
        if (fns.has(prop)) {
          return (__hostApi as any)[ns][prop]
        }
        throw new Error(
          `[Security] Module "${moduleId}" denied access to api.${ns}.${prop}. ` +
            `Add "${ns}.${prop}" to permissions.ipc to allow.`
        )
      }
    })
  }

  // Always provide module.invoke with self-scoping
  scoped.module = {
    invoke: (targetModuleId: string, method: string, ...args: any[]) => {
      // Self-invocation: always allowed
      if (targetModuleId === moduleId) {
        return __hostApi.module.invoke(targetModuleId, method, ...args)
      }
      // Cross-module: requires explicit permission
      if (crossModulePerms.has(targetModuleId)) {
        return __hostApi.module.invoke(targetModuleId, method, ...args)
      }
      throw new Error(
        `[Security] Module "${moduleId}" denied cross-module invoke to "${targetModuleId}". ` +
          `Add "module.invoke:${targetModuleId}" to permissions.ipc to allow.`
      )
    }
  }

  // Block undeclared namespaces entirely
  return new Proxy(scoped, {
    get(target: any, prop: string) {
      if (prop in target) return target[prop]
      throw new Error(
        `[Security] Module "${moduleId}" has no access to api.${prop}. ` +
          `Declare required methods in permissions.ipc.`
      )
    }
  })
}

export class ModuleRegistry implements RendererRegistrar {
  private contentModules: Map<string, ModuleDefinition> = new Map()
  private routes: Map<string, React.ComponentType | any> = new Map()
  private icons: Map<string, any> = new Map()
  private commands: any[] = []
  private globalProviders: {
    entry: ProviderRegistration
    component: React.ComponentType<any>
    moduleId: string
  }[] = []
  private routeProviders: { entry: ProviderRegistration; component: React.ComponentType<any> }[] =
    []

  // UI Global overlay slots (e.g. FloatingYouTubePlayer)
  private globalComponents: Map<string, React.ComponentType[]> = new Map()

  // Arbitrary named components
  private components: Map<string, any> = new Map()

  // Extensions
  private linkSearchProviders: LinkSearchProvider[] = []
  private crossLinkHandlers: CrossLinkHandler[] = []
  private navigationItems: NavigationItem[] = []
  private sidebarItems: SidebarItem[] = []
  private settingsConfigs: Map<string, PluginSettingsSchema> = new Map()
  private settingsPanels: Map<string, SettingsPanel> = new Map()

  // Module-contributed registries
  private contentViewers: Map<string, any> = new Map()
  private sectionEditors: Map<string, any> = new Map()
  private sectionTemplates: SectionTemplate[] = []
  private externalDataHandlers: ExternalDataHandler[] = []
  private statusWidgets: { id: string; group: string; component: any }[] = []

  // Per-module scoped APIs for CoreServices injection
  private moduleScopedApis = new Map<string, ScopedAPI>()

  // Host-provided dependencies for building per-module CoreServices
  private hostDeps: {
    getVaultPath: () => string | null
    getConfig: () => any
    getSettings: () => any
    getUpdateSetting: () => (key: string, value: any) => void
    getToast: () => any
    getCreateLocalEntry: () => ((data: any) => Promise<any>) | undefined
    getRemoveRelatedLinks: () => (targetIds: string[], linkType: string) => Promise<void>
    getCommandRegistry: () => any
    getSubscribe: () => (callback: (event: string, data: any) => void) => () => void
  } | null = null

  /**
   * Set host dependencies needed to build per-module CoreServices.
   * Must be called before loadModules.
   */
  setHostDeps(deps: typeof this.hostDeps) {
    this.hostDeps = deps
  }

  private loadedModuleIds = new Set<string>()

  /**
   * Bootstraps an array of modules by invoking their onRendererActivate lifecycles.
   * Each module receives a scoped API proxy based on its declared permissions.
   */
  async loadModules(modules: IModule[]) {
    for (const module of modules) {
      if (this.loadedModuleIds.has(module.id)) {
        console.log(`[ModuleRegistry] Module ${module.id} already active, skipping duplicate boot.`)
        continue
      }
      this.loadedModuleIds.add(module.id)

      const perms = module.permissions?.ipc ?? []

      // Static validation
      if (perms.length === 0) {
        console.log(
          `[ModuleRegistry] Activating module: ${module.id} (v${module.version}) — no IPC permissions`
        )
      } else {
        console.log(
          `[ModuleRegistry] Activating module: ${module.id} (v${module.version}) — IPC: [${perms.join(', ')}]`
        )
      }

      const scopedApi = createScopedApi(module.id, perms)
      this.moduleScopedApis.set(module.id, scopedApi)
      this._currentModuleId = module.id

      // Process declarative registrations
      if (module.contentModules) {
        for (const [key, cm] of Object.entries(module.contentModules))
          this.contentModules.set(key, cm)
      }
      if (module.contentViewers) {
        for (const [et, comp] of Object.entries(module.contentViewers))
          this.registerContentViewer(et, comp)
      }
      if (module.sectionEditors) {
        for (const [st, comp] of Object.entries(module.sectionEditors))
          this.registerSectionEditor(st, comp)
      }
      if (module.sectionTemplates) {
        for (const st of module.sectionTemplates) this.registerSectionTemplate(st)
      }

      if (module.settingsConfig) {
        this.registerPluginSettingsConfig(module.settingsConfig)
      }
      if (module.statusWidgets) {
        for (const sw of module.statusWidgets)
          this.registerStatusWidget(sw.id, sw.group, sw.component)
      }
      if (module.globalComponents) {
        for (const gc of module.globalComponents)
          this.registerGlobalComponent(gc.region, gc.component)
      }
      if (module.routes) {
        for (const rt of module.routes) this.registerRoute(rt.path, rt.component)
      }
      if (module.sidebarItems) {
        for (const si of module.sidebarItems) this.registerSidebarItem(si)
      }
      if (module.navigationItems) {
        for (const ni of module.navigationItems) this.registerNavigationItem(ni)
      }
      if (module.providers) {
        for (const prv of module.providers) this.registerProvider(prv.entry, prv.component)
      }
      if (module.linkSearchProviders) {
        for (const lsp of module.linkSearchProviders) this.registerLinkSearchProvider(lsp)
      }
      if (module.crossLinkHandlers) {
        for (const clh of module.crossLinkHandlers) this.registerCrossLinkHandler(clh)
      }
      if (module.externalDataHandlers) {
        for (const edh of module.externalDataHandlers) this.registerExternalDataHandler(edh)
      }

      if (module.onRendererActivate) {
        await module.onRendererActivate(this, scopedApi)
      }
      this._currentModuleId = ''
    }
  }

  /**
   * Build a CoreServices instance backed by a module's ScopedAPI.
   * IPC calls (fs.*, module.invoke, app.updateSetting) are permission-checked.
   */
  private buildModuleCoreServices(moduleId: string): CoreServices | null {
    const scopedApi = this.moduleScopedApis.get(moduleId)
    if (!scopedApi || !this.hostDeps) return null

    const api = scopedApi as unknown as CoreServicesAPI
    const vaultPath = this.hostDeps.getVaultPath()
    const storage = buildStorage(api, vaultPath)
    // Override subscribe with the host's data subscription
    storage.subscribe = this.hostDeps.getSubscribe()
    const feedDb = buildFeedDb(api)

    return {
      vaultPath,
      config: this.hostDeps.getConfig(),
      settings: this.hostDeps.getSettings(),
      toast: this.hostDeps.getToast(),
      storage,
      feedDb,
      removeRelatedLinks: this.hostDeps.getRemoveRelatedLinks(),
      commandRegistry: this.hostDeps.getCommandRegistry(),
      createLocalEntry: this.hostDeps.getCreateLocalEntry(),
      updateSetting: this.hostDeps.getUpdateSetting(),
      getPluginModules: () => this.getContentModules()
    }
  }

  // --- RendererRegistrar Implementation ---

  registerRoute(path: string, component: any) {
    this.routes.set(path, component)
  }

  registerIcon(name: string, icon: any) {
    this.icons.set(name, icon)
  }

  registerCommand(command: any) {
    this.commands.push(command)
  }

  // Track which module registered each provider
  private _currentModuleId: string = ''

  registerProvider(entry: ProviderRegistration, component: any) {
    if (entry.scope === 'global') {
      this.globalProviders.push({ entry, component, moduleId: this._currentModuleId })
      this.globalProviders.sort((a, b) => (a.entry.priority || 100) - (b.entry.priority || 100))
    } else {
      this.routeProviders.push({ entry, component })
    }
  }

  registerGlobalComponent(region: string, component: React.ComponentType) {
    const comps = this.globalComponents.get(region) || []
    comps.push(component)
    this.globalComponents.set(region, comps)
  }

  registerComponent(id: string, component: any) {
    this.components.set(id, component)
  }

  registerLinkSearchProvider(provider: LinkSearchProvider) {
    this.linkSearchProviders.push(provider)
  }

  registerCrossLinkHandler(handler: CrossLinkHandler) {
    this.crossLinkHandlers.push(handler)
  }

  registerNavigationItem(item: NavigationItem) {
    this.navigationItems.push(item)
    this.navigationItems.sort((a, b) => (a.priority ?? 100) - (b.priority ?? 100))
  }

  registerSidebarItem(item: SidebarItem) {
    this.sidebarItems.push(item)
    this.sidebarItems.sort((a, b) => (a.priority ?? 100) - (b.priority ?? 100))
  }

  // --- Accessors for App Shell ---
  getContentModules() {
    return Array.from(this.contentModules.values())
  }

  getRoutes() {
    return Array.from(this.routes.entries()).map(([path, component]) => ({ path, component }))
  }

  /**
   * Returns global providers wrapped with per-module CoreServices.
   * Each module's providers get a scoped CoreServicesContext.Provider
   * so their IPC calls go through the module's permission-checked ScopedAPI.
   */
  getGlobalProviders() {
    return this.globalProviders.map((p) => {
      const moduleServices = this.buildModuleCoreServices(p.moduleId)
      if (!moduleServices) return p.component

      // Wrap the module's provider with a scoped CoreServices context
      const OriginalProvider = p.component
      const ScopedProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => (
        <CoreServicesContext.Provider value={moduleServices}>
          <OriginalProvider>{children}</OriginalProvider>
        </CoreServicesContext.Provider>
      )
      ScopedProvider.displayName = `Scoped(${p.entry.id})`
      return ScopedProvider
    })
  }

  getGlobalComponents(region: string = 'global-overlay') {
    return this.globalComponents.get(region) || []
  }

  getComponent(id: string) {
    return this.components.get(id) || null
  }

  getLinkSearchProviders() {
    return this.linkSearchProviders
  }

  getCrossLinkHandlers() {
    return this.crossLinkHandlers
  }

  getCommands() {
    return this.commands
  }

  getNavigationItems() {
    return this.navigationItems
  }

  getSidebarItems() {
    return this.sidebarItems
  }

  registerPluginSettingsConfig(schema: PluginSettingsSchema) {
    if (this._currentModuleId) {
      this.settingsConfigs.set(this._currentModuleId, schema)
    }
  }

  getPluginSettingsConfig(moduleId: string) {
    return this.settingsConfigs.get(moduleId) || null
  }

  registerSettingsPanel(panel: SettingsPanel) {
    this.settingsPanels.set(panel.id, panel)
  }

  getSettingsPanels() {
    return Array.from(this.settingsPanels.values()).sort(
      (a, b) => (a.priority || 100) - (b.priority || 100)
    )
  }

  // --- Content Viewers (module-contributed entry type viewers) ---

  registerContentViewer(entryType: string, component: any) {
    this.contentViewers.set(entryType, component)
  }

  getContentViewer(entryType: string) {
    return this.contentViewers.get(entryType) || null
  }

  getContentViewerTypes() {
    return Array.from(this.contentViewers.keys())
  }

  // --- Section Editors (module-contributed inline editors for section types) ---

  registerSectionEditor(sectionType: string, component: any) {
    this.sectionEditors.set(sectionType, component)
  }

  registerSectionTemplate(template: SectionTemplate) {
    this.sectionTemplates.push(template)
  }

  getSectionEditor(sectionType: string) {
    return this.sectionEditors.get(sectionType) || null
  }

  getSectionEditorTypes() {
    return Array.from(this.sectionEditors.keys())
  }

  // --- Section Templates (module-contributed templates for "Add Section") ---

  getSectionTemplates() {
    return this.sectionTemplates
  }

  // --- External Data Handlers (module-contributed entry lifecycle data) ---

  registerExternalDataHandler(handler: ExternalDataHandler) {
    this.externalDataHandlers.push(handler)
  }

  getExternalDataHandlers() {
    return this.externalDataHandlers
  }

  // --- Status Widgets (module-contributed UI for System Status) ---

  registerStatusWidget(id: string, group: string, component: any) {
    this.statusWidgets.push({ id, group, component })
  }

  getStatusWidgets() {
    return this.statusWidgets
  }
}

// Global Singleton Instance for the Renderer App
export const appModuleRegistry = new ModuleRegistry()
