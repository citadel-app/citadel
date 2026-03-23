// Re-export core interfaces that plugin authors need
export type {
    IModule,
    RendererRegistrar,
    MainRegistrar,
    ProviderRegistration,
    LinkSearchProvider,
    CrossLinkHandler,
    ExternalDataHandler,
    NavigationItem,
    SidebarItem,
    SettingsPanel,
    ScopedAPI,
    CoreServices,
    ModuleDefinition,
    WorkspaceContext
} from '@citadel-app/core';

export const __sdkVersion = "1.0.0";
