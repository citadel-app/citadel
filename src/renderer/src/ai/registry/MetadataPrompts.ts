import { TypedPrompt } from './TypedPrompt';

// --- Smart Tags / Metadata ---
export interface MetadataInput {
    content: string;
    title: string;
    existingTags: string[];
    schema: string;
    context: string;
}

export interface EntryMetadataPatch {
    title?: string;
    tags?: string[];
    metadata?: Record<string, any>;
}

export const smartTagsPrompt = new TypedPrompt<MetadataInput, EntryMetadataPatch>({
    template: 'smart-tags',
    role: 'Expert Information Architect & Content Classifier',
    temperature: 0.6,
    parser: (raw) => {
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        if (jsonMatch) return JSON.parse(jsonMatch[0]);
        throw new Error("No valid JSON found in metadata response");
    }
});

// --- Summary ---
export interface SummaryInput {
    content: string;
    context?: string;
}

export const summaryPrompt = new TypedPrompt<SummaryInput, string>({
    template: 'summary',
    role: 'Expert Technical Writer & Editor',
    temperature: 0.6
});

// --- Proofread ---
export interface ProofreadInput {
    content: string;
}

export const proofreadPrompt = new TypedPrompt<ProofreadInput, string>({
    template: 'proofread',
    role: 'Senior Copy Editor',
    temperature: 0.3
});
// --- Section Battery ---
export interface SectionBatteryInput {
    sectionTitle: string;
    instructions: string;
    context: string;
    currentContent: string;
}

export const sectionBatteryPrompt = new TypedPrompt<SectionBatteryInput, string>({
    template: 'section-battery',
    role: 'Expert Content Generator',
    temperature: 0.7
});
