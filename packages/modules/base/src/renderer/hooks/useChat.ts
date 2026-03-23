import { useState, useCallback, useEffect } from 'react';
import { ChatMessage } from '@citadel-app/core';
import { hostApi as __hostApi } from '../host-services';

export interface UseChatOptions {
    entryId?: string;
    useRAG?: boolean;
    system?: string;
    temperature?: number;
    model?: string;
}

export function useChat(options: UseChatOptions = {}) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const sendMessage = useCallback(async (content: string) => {
        if (!content.trim()) return;

        const userMessage: ChatMessage = { role: 'user', content };
        const newMessages = [...messages, userMessage];
        setMessages(newMessages);
        setIsLoading(true);
        setError(null);

        // Add placeholder for assistant response
        const assistantMessage: ChatMessage = { role: 'assistant', content: '' };
        setMessages([...newMessages, assistantMessage]);

        try {
            let fullResponse = '';
            
            // Listen for chunks
            const unsubscribeChunk = __hostApi.on('ai:chat-chunk', (chunk: string) => {
                fullResponse += chunk;
                setMessages(prev => {
                    const last = prev[prev.length - 1];
                    if (last && last.role === 'assistant') {
                        return [...prev.slice(0, -1), { ...last, content: fullResponse }];
                    }
                    return prev;
                });
            });

            const unsubscribeEnd = __hostApi.on('ai:chat-end', () => {
                setIsLoading(false);
                unsubscribeChunk();
                unsubscribeEnd();
            });

            // Trigger stream in main
            await __hostApi.module.invoke('@citadel-app/base', 'ai.chatStream', newMessages, {
                entryId: options.entryId,
                useRAG: options.useRAG,
                system: options.system,
                temperature: options.temperature,
                model: options.model
            });

        } catch (err: any) {
            setError(err.message || 'Failed to send message');
            setIsLoading(false);
        }
    }, [messages, options]);

    const clearHistory = useCallback(() => {
        setMessages([]);
        setError(null);
    }, []);

    const abortChat = useCallback(async () => {
        await __hostApi.module.invoke('@citadel-app/base', 'ai.abortChat');
        setIsLoading(false);
    }, []);

    return {
        messages,
        setMessages,
        sendMessage,
        isLoading,
        error,
        clearHistory,
        abortChat
    };
}
