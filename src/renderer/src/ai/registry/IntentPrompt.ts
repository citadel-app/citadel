import { TypedPrompt } from './TypedPrompt';

export interface IntentInput {
    query: string;
    entryTypes: string; // Formatted summary of entry types
}

export interface IntentOutput {
    searchQuery: string;
    navigationIntent: {
        intent: 'navigate_app' | 'navigate_entry';
        target: string;
        confidence: number;
    } | null;
    isComplex: boolean;
    requiresContext: boolean;
}

export const intentPrompt = new TypedPrompt<IntentInput, IntentOutput>({
    template: 'intent-analysis',
    role: 'Expert Software Architect & Information Retrieval Specialist',
    temperature: 0.1, // Low temperature for deterministic intent parsing
    parser: (raw) => {
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            return {
                searchQuery: parsed.searchQuery || "",
                navigationIntent: parsed.navigationIntent || null,
                isComplex: !!parsed.isComplex,
                requiresContext: parsed.requiresContext !== undefined ? !!parsed.requiresContext : true
            };
        }
        throw new Error("No valid JSON found in intent analysis response");
    }
});
