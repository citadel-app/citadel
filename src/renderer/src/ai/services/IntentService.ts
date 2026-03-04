import { db } from '../../lib/db';
import { intentPrompt, IntentOutput } from '../registry/IntentPrompt';

export class IntentService {
    /**
     * Analyzes user intent using the specialized intent-analysis prompt.
     */
    async analyze(query: string, entryTypes: Record<string, any> = {}): Promise<IntentOutput> {
        const entryTypesSummary = Object.values(entryTypes)
            .map(t => `- ${t.label}: ${t.description}`)
            .join('\n');

        const result = await intentPrompt.execute({
            query,
            entryTypes: entryTypesSummary
        });

        if (!result) {
            return {
                searchQuery: query,
                navigationIntent: null,
                isComplex: false,
                requiresContext: true
            };
        }

        return result;
    }

    /**
     * Resolves a navigation intent into a concrete URL and title.
     * Incorporates robust matching logic for entries.
     */
    async resolveNavigation(intent: IntentOutput['navigationIntent']): Promise<{ url: string; title: string } | null> {
        if (!intent) return null;

        if (intent.intent === 'navigate_app') {
            return {
                url: intent.target,
                title: intent.target.replace('/', '').toUpperCase()
            };
        }

        if (intent.intent === 'navigate_entry') {
            const target = intent.target;
            
            // 1. Exact case-insensitive match
            let entry = await db.entries
                .where('title')
                .equalsIgnoreCase(target)
                .first();

            // 2. Fallback: Strip common suffixes (problem, entry, note)
            if (!entry && (target.toLowerCase().endsWith(' problem') || target.toLowerCase().endsWith(' entry') || target.toLowerCase().endsWith(' note'))) {
                const strippedTarget = target.replace(/\b(problem|entry|note)\b/gi, '').trim();
                console.log('[IntentService] Fallback lookup with stripped target:', strippedTarget);
                entry = await db.entries
                    .where('title')
                    .equalsIgnoreCase(strippedTarget)
                    .first();
            }

            if (entry) {
                return {
                    url: `/${entry.type}/${entry.id}`,
                    title: entry.title
                };
            }
        }

        return null;
    }
}

export const intentService = new IntentService();
