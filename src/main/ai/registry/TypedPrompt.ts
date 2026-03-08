import { PromptEngine } from '../PromptEngine';
import { ProviderRegistry } from '../providers/ProviderRegistry';
import { PromptDefinition } from './PromptDefinition';

export class TypedPrompt<I extends object, O> {
    private definition: PromptDefinition<I, O>;
    private promptEngine: PromptEngine;
    private providerRegistry: ProviderRegistry;

    constructor(definition: PromptDefinition<I, O>, promptEngine: PromptEngine, providerRegistry: ProviderRegistry) {
        this.definition = definition;
        this.promptEngine = promptEngine;
        this.providerRegistry = providerRegistry;
    }

    /**
     * Executes the prompt with the given input and returns the structured output.
     */
    async execute(input: I, options?: { model?: string; temperature?: number }): Promise<O | null> {
        const llm = this.providerRegistry.getLLMProvider();
        const settings = await llm.getSettings();
        const model = options?.model || settings.model;
        const temperature = options?.temperature ?? this.definition.temperature ?? settings.temperature;

        const context = {
            ...this.definition.defaultContext,
            ...input,
            role: this.definition.role
        };

        const renderedPrompt = await this.promptEngine.render(this.definition.template, context);

        const rawResponse = await llm.generate({
            model: model,
            prompt: renderedPrompt,
            temperature: temperature,
            stream: false
        });

        if (!rawResponse) return null;

        const cleaned = this.cleanAIResponse(rawResponse);

        if (this.definition.parser) {
            try {
                return await this.definition.parser(cleaned);
            } catch (e) {
                console.error(`[TypedPrompt] Failed to parse response for ${this.definition.template}:`, e);
                return null;
            }
        }

        return cleaned as unknown as O;
    }

    private cleanAIResponse(text: string): string {
        if (!text) return '';
        let cleaned = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
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
        cleaned = cleaned.replace(/```(?:[\w]*)\n?([\s\S]*?)```/gi, '$1').trim();
        cleaned = cleaned.replace(/\n---\n/g, '\n***\n');
        return cleaned.trim();
    }
}
