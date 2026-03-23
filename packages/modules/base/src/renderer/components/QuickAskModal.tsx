import React, { useEffect, useState, useRef } from 'react';
import { useLayout } from '../context/LayoutContext';
import { useChat } from '../hooks/useChat';
import { Icon } from '@citadel-app/ui';
import { ChatMessageItem } from './ChatMessageItem';
import { ChatInput } from './ChatInput';
import { cn } from '@citadel-app/ui';
import { DndContext, useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

export const QuickAskModal = () => {
    const { quickAskSessions, closeQuickAsk, updateQuickAskPosition } = useLayout();

    if (quickAskSessions.length === 0) return null;

    return (
        <DndContext onDragEnd={(event) => {
            const { active, delta } = event;
            const sessionId = active.id as string;
            const session = quickAskSessions.find(s => s.id === sessionId);
            if (session) {
                updateQuickAskPosition(sessionId, {
                    x: session.position.x + delta.x,
                    y: session.position.y + delta.y
                });
            }
        }}>
            {quickAskSessions.map((session) => (
                <DraggableModal
                    key={session.id}
                    session={session}
                    onClose={() => closeQuickAsk(session.id)}
                />
            ))}
        </DndContext>
    );
};

interface DraggableModalProps {
    session: { id: string; query: string; position: { x: number; y: number } };
    onClose: () => void;
}

const DraggableModal = ({ session, onClose }: DraggableModalProps) => {
    const { attributes, listeners, setNodeRef, transform } = useDraggable({
        id: session.id,
    });

    const style = {
        transform: CSS.Translate.toString(transform),
        left: `${session.position.x}px`,
        top: `${session.position.y}px`,
    };

    const {
        messages,
        sendMessage,
        isLoading,
        error,
        abortChat
    } = useChat({
        useRAG: false
    });

    const hasStarted = useRef(false);

    useEffect(() => {
        if (session.query && !hasStarted.current) {
            hasStarted.current = true;
            sendMessage(session.query);
        }
    }, [session.query, sendMessage]);

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="fixed w-[450px] min-h-[300px] max-h-[600px] bg-background/80 backdrop-blur-xl border border-primary/20 rounded-2xl shadow-2xl z-[9999] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        >
            {/* Header / Handle */}
            <div className="h-10 px-4 bg-primary/5 border-b border-primary/10 flex items-center justify-between select-none">
                <div
                    {...listeners}
                    {...attributes}
                    className="flex flex-1 items-center gap-2 cursor-move h-full"
                >
                    <Icon name="Cpu" size={14} className="text-primary" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-primary/80">Quick Communion</span>
                </div>
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        onClose();
                    }}
                    className="p-1.5 hover:bg-red-500/10 hover:text-red-500 rounded transition-colors group relative z-50"
                >
                    <Icon name="X" size={14} />
                </button>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                {messages.length === 0 && !isLoading && (
                    <div className="flex flex-col items-center justify-center h-full text-center py-12 opacity-50">
                        <Icon name="MessageSquare" size={32} strokeWidth={1} className="mb-2" />
                        <p className="text-xs font-medium uppercase tracking-tighter">Ready for your query...</p>
                    </div>
                )}
                {messages.map((msg, idx) => (
                    <ChatMessageItem
                        key={idx}
                        msg={msg}
                        isZen
                        isLast={idx === messages.length - 1}
                        isGenerating={isLoading}
                    />
                ))}
                {isLoading && (
                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase text-primary/50 animate-pulse ml-2">
                        <Icon name="Loader2" size={12} className="animate-spin" />
                        Transcribing...
                    </div>
                )}
                {error && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-500">
                        {error}
                    </div>
                )}
                <div ref={(el) => el?.scrollIntoView({ behavior: 'smooth' })} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-muted/20 border-t border-border/40">
                <ChatInput
                    variant="chat"
                    isSearching={isLoading}
                    onSearch={sendMessage}
                    className="mini-chat-input"
                />
            </div>
        </div>
    );
};
