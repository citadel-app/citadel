import { createContext, useContext, useState, ReactNode } from 'react';

type SplitOrientation = 'horizontal' | 'vertical'; // vertical = columns (side-by-side), horizontal = rows (top-bottom)
type ActivePanel = 'both' | 'left' | 'right';

interface LayoutContextType {
    splitOrientation: SplitOrientation;
    setSplitOrientation: (orientation: SplitOrientation) => void;
    toggleSplitOrientation: () => void;
    activePanel: ActivePanel;
    setActivePanel: (panel: ActivePanel) => void;
    isCreateDialogOpen: boolean;
    setIsCreateDialogOpen: (open: boolean) => void;
    openCreateDialog: () => void;
}

const LayoutContext = createContext<LayoutContextType | undefined>(undefined);

export const LayoutProvider = ({ children }: { children: ReactNode }) => {
    const [splitOrientation, setSplitOrientation] = useState<SplitOrientation>('horizontal');
    const [activePanel, setActivePanel] = useState<ActivePanel>('both');
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

    const toggleSplitOrientation = () => {
        setSplitOrientation(prev => prev === 'vertical' ? 'horizontal' : 'vertical');
    };

    const openCreateDialog = () => setIsCreateDialogOpen(true);

    return (
        <LayoutContext.Provider value={{
            splitOrientation,
            setSplitOrientation,
            toggleSplitOrientation,
            activePanel,
            setActivePanel,
            isCreateDialogOpen,
            setIsCreateDialogOpen,
            openCreateDialog
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
