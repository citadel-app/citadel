import React, { createContext, useContext, useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';

export type ToastType = 'info' | 'success' | 'warning' | 'error';

export interface ToastAction {
    label: string;
    onClick: () => void;
}

export interface ToastOptions {
    type?: ToastType;
    duration?: number; // ms
    action?: ToastAction;
}

export interface Toast {
    id: string;
    message: string;
    type: ToastType;
    action?: ToastAction;
}

interface ToastContextType {
    toasts: Toast[];
    toast: (message: string, options?: ToastOptions) => void;
    dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const dismiss = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const toast = useCallback((message: string, options?: ToastOptions) => {
        const id = uuidv4();
        const type = options?.type || 'info';
        const duration = options?.duration || 5000;

        const newToast: Toast = {
            id,
            message,
            type,
            action: options?.action,
        };

        setToasts((prev) => [...prev, newToast]);

        if (duration !== Infinity) {
            setTimeout(() => {
                dismiss(id);
            }, duration);
        }
    }, [dismiss]);

    return (
        <ToastContext.Provider value={{ toasts, toast, dismiss }}>
            {children}
        </ToastContext.Provider>
    );
};

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};
