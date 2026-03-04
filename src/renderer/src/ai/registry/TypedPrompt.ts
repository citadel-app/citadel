import { PromptDefinition } from './PromptDefinition';
import { promptEngine } from '../core/PromptEngine';
import { providerRegistry } from '../providers/ProviderRegistry';

export class TypedPrompt<I extends object, O> {
    private definition: PromptDefinition<I, O>;

    constructor(definition: PromptDefinition<I, O>) {
        this.definition = definition;
    }

    /**
     * Executes the prompt with the given input and returns the structured output.
     */
    async execute(input: I, options?: { model?: string; temperature?: number }): Promise<O | null> {
        // 1. Get Settings (via provider)
        const llm = providerRegistry.getLLMProvider();
        const settings = await llm.getSettings();
        const model = options?.model || settings.model;
        const temperature = options?.temperature ?? this.definition.temperature ?? settings.temperature;

        // 2. Prepare Context (Merge defaults with input)
        const context = {
            ...this.definition.defaultContext,
            ...input,
            role: this.definition.role
        };

        // 3. Render Template
        const renderedPrompt = await promptEngine.render(this.definition.template, context);

        // 4. Call AI (via provider)
        const rawResponse = await llm.generate({
            model: model,
            prompt: renderedPrompt,
            temperature: temperature,
            stream: false
        });

        if (!rawResponse) return null;

        // 5. Clean Response (Standard Principles)
        const cleaned = this.cleanAIResponse(rawResponse);

        // 6. Parse Response
        if (this.definition.parser) {
            try {
                return await this.definition.parser(cleaned);
            } catch (e) {
                console.error(`[TypedPrompt] Failed to parse response for ${this.definition.template}:`, e);
                return null;
            }
        }

        // If no parser, cast to O (usually string if no parser provided)
        return cleaned as unknown as O;
    }

    /**
     * Standardized cleaning based on principles: remove <think> tags, fences, etc.
     */
    private cleanAIResponse(text: string): string {
        if (!text) return '';
        
        // 1. Remove <think> blocks (DeepSeek R1 etc.)
        let cleaned = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
        
        // 2. Remove common conversational preambles
        const preambles = [
            /^here is the content:?\s*/i,
            /^here is the updated section:?\s*/i,
            /^based on the context, here is the generated content:?\s*/i,
            /^certainly!? here is the section content:?\s*/i,
            /^here is the json response:?\s*/i
        ];
        for (const preamble of preambles) {
            cleaned = cleaned.replace(preamble, '');
        }

        // 3. Remove Markdown code fences
        cleaned = cleaned.replace(/```(?:[\w]*)\n?([\s\S]*?)```/gi, '$1').trim();

        // 4. Sanitize internal section separators
        cleaned = cleaned.replace(/\n---\n/g, '\n***\n');

        return cleaned.trim();
    }
}
