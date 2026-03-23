import { db } from '../../lib/db';
import { hostApi as __hostApi } from '../../host-services';

export class IntentService {
    /**
     * Analyzes user intent using the specialized intent-analysis prompt.
     */
    async analyze(query: string, entryTypes: Record<string, any> = {}): Promise<any> {
        return __hostApi.module.invoke('@citadel-app/base', 'ai.analyzeIntent', query, entryTypes);
    }

    /**
     * Resolves a navigation intent into a concrete URL and title.
     */
    async resolveNavigation(intent: any): Promise<{ url: string; title: string } | null> {
        if (!intent) return null;

        if (intent.intent === 'navigate_app') {
            return {
                url: intent.target,
                title: intent.target.replace('/', '').toUpperCase()
            };
        }

        if (intent.intent === 'navigate_entry') {
            const target = intent.target;
            
            const entry = await db.entries
                .where('title')
                .equalsIgnoreCase(target)
                .first();

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
