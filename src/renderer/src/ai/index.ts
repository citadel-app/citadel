// Provider System (new)
export { providerRegistry } from './providers/ProviderRegistry';
export type { LLMProvider, EmbeddingProvider, VectorStoreProvider, VectorPoint, GenerateOptions } from './providers/interfaces';
export type { AIModel, AIModelSettings } from './providers/interfaces';
export { OllamaProvider } from './providers/OllamaProvider';
export { OpenAIProvider } from './providers/OpenAIProvider';
export { GeminiProvider } from './providers/GeminiProvider';
export { QdrantStore } from './providers/QdrantStore';

// Core (legacy compat - these now delegate to providerRegistry)
export { promptEngine, PromptEngine } from './core/PromptEngine';

// Backward-compatible singletons — pages import these by name
import { providerRegistry } from './providers/ProviderRegistry';
export const ollamaClient = providerRegistry.getOllamaProvider();
export const vectorService = providerRegistry.getQdrantStore();

// Registry & Types (legacy re-exports)
export * from './registry/PromptDefinition';
export * from './registry/TypedPrompt';
export * from './registry/IntentPrompt';
export * from './registry/MetadataPrompts';
export * from './registry/ChatPrompts';

// Services
export { intentService, IntentService } from './services/IntentService';
export { metadataService, MetadataService, type EntryMetadataPatch } from './services/MetadataService';
export { chatService, ChatService } from './services/ChatService';
export { ragService, RAGService } from './services/RAGService';

// Constants
export * from './constants';

// Components
export * from './components/IndexStatusBadge';
export * from './components/SmartActionsMenu';
export * from './components/SummaryDialog';
export * from './components/SmartTagsDialog';
export * from './components/GrammarDialog';
