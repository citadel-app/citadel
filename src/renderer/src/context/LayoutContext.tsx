import { createContext, useContext, useState, ReactNode } from 'react';

type SplitOrientation = 'horizontal' | 'vertical'; // vertical = columns (side-by-side), horizontal = rows (top-bottom)
type ActivePanel = 'both' | 'left' | 'right';

interface QuickAskSession {
    id: string;
    query: string;
    position: { x: number; y: number };
}

interface LayoutContextType {
    splitOrientation: SplitOrientation;
    setSplitOrientation: (orientation: SplitOrientation) => void;
    toggleSplitOrientation: () => void;
    activePanel: ActivePanel;
    setActivePanel: (panel: ActivePanel) => void;
    isCreateDialogOpen: boolean;
    setIsCreateDialogOpen: (open: boolean) => void;
    openCreateDialog: () => void;
    quickAskSessions: QuickAskSession[];
    openQuickAsk: (query: string) => void;
    closeQuickAsk: (id: string) => void;
    updateQuickAskPosition: (id: string, position: { x: number; y: number }) => void;
}

const LayoutContext = createContext<LayoutContextType | undefined>(undefined);

export const LayoutProvider = ({ children }: { children: ReactNode }) => {
    const [splitOrientation, setSplitOrientation] = useState<SplitOrientation>('horizontal');
    const [activePanel, setActivePanel] = useState<ActivePanel>('both');
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

    const [quickAskSessions, setQuickAskSessions] = useState<QuickAskSession[]>([]);

    const toggleSplitOrientation = () => {
        setSplitOrientation(prev => prev === 'vertical' ? 'horizontal' : 'vertical');
    };

    const openCreateDialog = () => setIsCreateDialogOpen(true);

    const openQuickAsk = (query: string) => {
        const id = Math.random().toString(36).substring(7);
        // Cascade position slightly for each new modal
        const offset = quickAskSessions.length * 30;
        setQuickAskSessions(prev => [
            ...prev,
            { id, query, position: { x: 100 + offset, y: 100 + offset } }
        ]);
    };

    const closeQuickAsk = (id: string) => {
        setQuickAskSessions(prev => prev.filter(s => s.id !== id));
    };

    const updateQuickAskPosition = (id: string, position: { x: number; y: number }) => {
        setQuickAskSessions(prev => prev.map(s => s.id === id ? { ...s, position } : s));
    };

    return (
        <LayoutContext.Provider value={{
            splitOrientation,
            setSplitOrientation,
            toggleSplitOrientation,
            activePanel,
            setActivePanel,
            isCreateDialogOpen,
            setIsCreateDialogOpen,
            openCreateDialog,
            quickAskSessions,
            openQuickAsk,
            closeQuickAsk,
            updateQuickAskPosition
        }}>
            {children}
        </LayoutContext.Provider>
    );
};

export const useLayout = () => {
    const context = useContext(LayoutContext);
    if (!context) {
        throw new Error('useLayout must be used within a LayoutProvider');
    }
    return context;
};
