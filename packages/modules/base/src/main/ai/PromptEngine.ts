import { Liquid } from 'liquidjs';
import * as fs from 'fs';
import * as path from 'path';
import { is } from '@electron-toolkit/utils';

export class PromptEngine {
    private engine: Liquid;
    private templates: Record<string, string> = {};
    private templateDir: string;

    constructor() {
        this.engine = new Liquid();
        
        // Determine template directory based on environment
        this.templateDir = is.dev
            ? path.join(process.cwd(), 'src/main/ai/prompts')
            : path.join(process.resourcesPath, 'ai/prompts');

        this.loadTemplates();
    }

    private loadTemplates() {
        try {
            if (!fs.existsSync(this.templateDir)) {
                console.error(`[PromptEngine] Template directory not found: ${this.templateDir}`);
                return;
            }

            const files = fs.readdirSync(this.templateDir);
            files.forEach(file => {
                if (file.endsWith('.liquid')) {
                    const name = path.basename(file, '.liquid');
                    const content = fs.readFileSync(path.join(this.templateDir, file), 'utf-8');
                    this.templates[name] = content;
                    console.log(`[PromptEngine] Template loaded: ${name}`);
                }
            });
            console.log(`[PromptEngine] Total templates loaded: ${Object.keys(this.templates).length}`);
        } catch (error) {
            console.error('[PromptEngine] Failed to load templates:', error);
        }
    }

    /**
     * Renders a named template with the given context.
     */
    async render(templateName: string, context: object): Promise<string> {
        const template = this.templates[templateName];
        if (!template) {
            throw new Error(`Template '${templateName}' not found. Available: ${Object.keys(this.templates).join(', ')}`);
        }

        try {
            const prompt = await this.engine.parseAndRender(template, context);
            return prompt;
        } catch (error) {
            console.error(`[PromptEngine] Failed to render template '${templateName}'`, error);
            throw error;
        }
    }
}

export const promptEngine = new PromptEngine();
