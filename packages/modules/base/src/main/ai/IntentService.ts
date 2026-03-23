import { createIntentPrompt } from './registry/IntentPrompt';
import { PromptEngine } from './PromptEngine';
import { ProviderRegistry } from './providers/ProviderRegistry';
import { IntentResult } from '@citadel-app/core';

export class IntentService {
    private promptEngine: PromptEngine;
    private providerRegistry: ProviderRegistry;

    constructor(promptEngine: PromptEngine, providerRegistry: ProviderRegistry) {
        this.promptEngine = promptEngine;
        this.providerRegistry = providerRegistry;
    }

    /**
     * Analyzes user intent using the specialized intent-analysis prompt.
     */
    async analyze(query: string, entryTypes: Record<string, any> = {}, commands: any[] = []): Promise<IntentResult> {
        const entryTypesSummary = Object.values(entryTypes)
            .map(t => `- ${t.label}: ${t.description}`)
            .join('\n');

        const commandsSummary = commands
            .map(c => `- ${c.id}: ${c.name} (${c.description || 'No description'})`)
            .join('\n');

        const intentPrompt = createIntentPrompt(this.promptEngine, this.providerRegistry);
        const result = await intentPrompt.execute({
            query,
            entryTypes: entryTypesSummary,
            commands: commandsSummary
        });

        if (!result) {
            return {
                searchQuery: query,
                navigationIntent: null,
                commandIntent: null,
                isComplex: false,
                requiresContext: true
            };
        }

        return result;
    }
}
