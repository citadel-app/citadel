/**
 * Fields that should be promoted from frontmatter to top-level DB properties.
 * This ensures we can index them in Dexie.
 */
export const TOP_LEVEL_FIELDS = [
    'sourceUrl',
    'companies',
    'difficulty',
    'author',
    'publishedAt',
    'relatedLinks',
    'isbn',
    'publisher',
    'publishedDate',
    'status'
] as const;

/**
 * Global synchronization version. 
 * Increment this to force a full re-sync for all users.
 */
export const SYNC_VERSION = 16;
