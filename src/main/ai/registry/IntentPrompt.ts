import { TypedPrompt } from './TypedPrompt';
import { PromptEngine } from '../PromptEngine';
import { ProviderRegistry } from '../providers/ProviderRegistry';
import { IntentResult } from '../../../shared';

export interface IntentInput {
    query: string;
    entryTypes: string;
    commands: string;
}

export function createIntentPrompt(promptEngine: PromptEngine, providerRegistry: ProviderRegistry) {
    return new TypedPrompt<IntentInput, IntentResult>({
        template: 'intent-analysis',
        role: 'Expert Software Architect & Information Retrieval Specialist',
        temperature: 0.1,
        parser: (raw) => {
            const jsonMatch = raw.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                return {
                    searchQuery: parsed.searchQuery || "",
                    navigationIntent: parsed.navigationIntent || null,
                    commandIntent: parsed.commandIntent || null,
                    isComplex: !!parsed.isComplex,
                    requiresContext: parsed.requiresContext !== undefined ? !!parsed.requiresContext : true
                };
            }
            throw new Error("No valid JSON found in intent analysis response");
        }
    }, promptEngine, providerRegistry);
}
