import { Liquid } from 'liquidjs';

/**
 * PromptEngine handles the loading and rendering of Liquid templates.
 * It uses Vite's `import.meta.glob` to automatically load all .liquid files
 * from the ../prompts directory as raw strings.
 */
export class PromptEngine {
    private engine: Liquid;
    private templates: Record<string, string> = {};

    constructor() {
        this.engine = new Liquid();
        this.loadTemplates();
    }

    private loadTemplates() {
        // Automatically load all .liquid files from the prompts folder
        // The results are raw strings thanks to the `?raw` suffix or Vite config.
        // Actually, for glob to work with raw content in Vite, we use 'query': '?raw'
        const rawTemplates = import.meta.glob('../prompts/*.liquid', { 
            query: '?raw', 
            eager: true,
            import: 'default'
        });

        for (const path in rawTemplates) {
            const name = path.split('/').pop()?.replace('.liquid', '');
            if (name) {
                this.templates[name] = rawTemplates[path] as string;
                console.log(`[PromptEngine] Template loaded: ${name}`);
            }
        }
        console.log(`[PromptEngine] Total templates loaded: ${Object.keys(this.templates).length}. Available: ${Object.keys(this.templates).join(', ')}`);
    }

    /**
     * Renders a named template with the given context.
     * @param templateName The key of the template (e.g., 'smart-tags')
     * @param context Data to inject into liquid tags
     */
    async render(templateName: string, context: object): Promise<string> {
        const template = this.templates[templateName];
        if (!template) {
            throw new Error(`Template '${templateName}' not found. Available: ${Object.keys(this.templates).join(', ')}`);
        }

        try {
            const prmpt = await this.engine.parseAndRender(template, context);
            return prmpt;
        } catch (error) {
            console.error(`[PromptEngine] Failed to render template '${templateName}'`, error);
            throw error;
        }
    }
}

export const promptEngine = new PromptEngine();
