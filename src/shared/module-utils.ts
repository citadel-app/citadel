import { type EntryTypeConfig, type ModuleDefinition } from './codex/entry-types';

/**
 * Determines which field key should store a URL/Source for a given entry type,
 * based on its Primary Module configuration and mapping.
 * 
 * @param entryType The configuration for the entry type.
 * @param modulesRegistry The registry of available modules.
 * @returns The key of the field to likely store the URL, or null if unrelated.
 */
export const getPrimaryFieldForUrl = (
    entryType: EntryTypeConfig,
    modulesRegistry: Record<string, ModuleDefinition>
): string | null => {
    const primary = entryType.view.modules.primary;
    if (!primary) return null;

    // 1. Identify Primary Module ID
    const moduleId = typeof primary === 'string' ? primary : primary.id;
    const moduleDef = modulesRegistry[moduleId];

    if (!moduleDef) return null;

    // 2. Find URL Requirement
    // We look for a requirement that accepts 'url' or 'file' (since file inputs often handle URIs)
    const urlRequirement = moduleDef.requirements.find(req => 
        req.types.includes('url') || req.types.includes('file')
    );

    if (!urlRequirement) return null;

    // 3. Resolve Mapped Field
    // If it's a string config (shorthand), we assume default mapping if exists, 
    // or we check if the requirement key matches a field name.
    const map = typeof primary === 'object' ? primary.map : undefined;

    if (map && map[urlRequirement.key]) {
        return map[urlRequirement.key];
    }

    // Implicit fallback: If the requirement key exists as a field in the entry type
    const fieldExists = entryType.fields.some(f => f.key === urlRequirement.key) || 
                        entryType.metadata.some(m => m.key === urlRequirement.key);
    
    if (fieldExists) {
        return urlRequirement.key;
    }

    return null;
};
