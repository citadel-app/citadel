export let hostApi: any = null;
export let appModuleRegistry: any = null;

export function initHostServices(api: any, registry: any) {
    hostApi = api;
    appModuleRegistry = registry;
}
