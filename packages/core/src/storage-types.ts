export interface WhiteboardData {
    id: string; // 'default' for now
    elements: any[];
    appState: any;
    files: any;
    updatedAt: string;
}

export interface EditorData {
    id: string; // 'default' for now
    content: string;
    language: string;
    updatedAt: string;
}

export interface NotesData {
    id: string; // 'default' for now
    content: string;
    updatedAt: string;
}

export interface LatexData {
    id: string; // 'default' for now
    content: string;
    updatedAt: string;
}

export interface ChatSession {
    id: string;
    title: string;
    messages: any[]; // ChatMessage[] - but keeping it simple for now to avoid circular if any
    createdAt: string;
    updatedAt: string;
}
