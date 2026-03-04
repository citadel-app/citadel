import { TypedPrompt } from './TypedPrompt';

export interface ChatInput {
    query: string;
    context: string;
    history?: { role: 'user' | 'assistant'; content: string }[];
}

export const chatPrompt = new TypedPrompt<ChatInput, string>({
    template: 'chat-answer',
    role: 'Expert Engineering Assistant',
    temperature: 0.7
});

export const ragAnswerPrompt = new TypedPrompt<ChatInput, string>({
    template: 'rag-answer',
    role: 'Expert Librarian & Technical Researcher',
    temperature: 0.5
});
