import { 
    smartTagsPrompt, 
    summaryPrompt, 
    proofreadPrompt,
    sectionBatteryPrompt,
    EntryMetadataPatch
} from '../registry/MetadataPrompts';

export type { EntryMetadataPatch };

export class MetadataService {
    /**
     * Generates metadata (title, tags, etc.) for a content block.
     */
    async generateMetadata(
        content: string, 
        title: string, 
        existingTags: string[], 
        schema: string = '', 
        context: string = ''
    ): Promise<EntryMetadataPatch | null> {
        return smartTagsPrompt.execute({
            content,
            title,
            existingTags,
            schema,
            context
        });
    }

    /**
     * Generates a 2-3 sentence summary of the content.
     */
    async generateSummary(content: string, context?: string): Promise<string | null> {
        return summaryPrompt.execute({ content, context });
    }

    /**
     * Proofreads the content for grammar, spelling, and style.
     */
    async proofread(content: string): Promise<string | null> {
        return proofreadPrompt.execute({ content });
    }

    /**
     * Generates focused content for a specific entry section.
     */
    async generateSection(
        sectionTitle: string,
        instructions: string,
        context: string,
        currentContent: string = ''
    ): Promise<string | null> {
        return sectionBatteryPrompt.execute({
            sectionTitle,
            instructions,
            context,
            currentContent
        });
    }
}

export const metadataService = new MetadataService();
