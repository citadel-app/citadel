import { TypedPrompt } from './TypedPrompt';
import { PromptEngine } from '../PromptEngine';
import { ProviderRegistry } from '../providers/ProviderRegistry';
import { MetadataInput, EntryMetadataPatch, SummaryInput, ProofreadInput, SectionBatteryInput } from '@citadel-app/core';

// --- Smart Tags / Metadata ---

export function createSmartTagsPrompt(engine: PromptEngine, registry: ProviderRegistry) {
    return new TypedPrompt<MetadataInput, EntryMetadataPatch>({
        template: 'smart-tags',
        role: 'Expert Information Architect & Content Classifier',
        temperature: 0.6,
        parser: (raw) => {
            const jsonMatch = raw.match(/\{[\s\S]*\}/);
            if (jsonMatch) return JSON.parse(jsonMatch[0]);
            throw new Error("No valid JSON found in metadata response");
        }
    }, engine, registry);
}

export function createSummaryPrompt(engine: PromptEngine, registry: ProviderRegistry) {
    return new TypedPrompt<SummaryInput, string>({
        template: 'summary',
        role: 'Expert Technical Writer & Editor',
        temperature: 0.6
    }, engine, registry);
}

// --- Proofread ---

export function createProofreadPrompt(engine: PromptEngine, registry: ProviderRegistry) {
    return new TypedPrompt<ProofreadInput, string>({
        template: 'proofread',
        role: 'Senior Copy Editor',
        temperature: 0.3
    }, engine, registry);
}

// --- Section Battery ---

export function createSectionBatteryPrompt(engine: PromptEngine, registry: ProviderRegistry) {
    return new TypedPrompt<SectionBatteryInput, string>({
        template: 'section-battery',
        role: 'Expert Content Generator',
        temperature: 0.7
    }, engine, registry);
}
