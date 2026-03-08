export interface PromptDefinition<I, O> {
    /** The key of the liquid template (e.g., 'smart-tags') */
    template: string;
    
    /** The persona/role of the AI for this specific task */
    role: string;
    
    /** Override default temperature */
    temperature?: number;
    
    /** Optional parser to convert raw AI response string to structured output O */
    parser?: (raw: string) => O | Promise<O>;
    
    /** Any default context variables for the liquid template */
    defaultContext?: Partial<I>;

    /** Whether to force thinking mode */
    forceThinking?: boolean;
}
