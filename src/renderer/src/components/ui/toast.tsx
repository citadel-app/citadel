import React from 'react';
import { cn } from '../../lib/utils';
import { Icon } from '../IconRegistry';
import { useToast, Toast as ToastType } from '../../context/ToastContext';

const getToastIcon = (type: ToastType['type']) => {
    switch (type) {
        case 'success':
            return <Icon name="CheckCircle2" size={16} className="text-green-500" />;
        case 'warning':
            return <Icon name="AlertTriangle" size={16} className="text-amber-500" />;
        case 'error':
            return <Icon name="AlertCircle" size={16} className="text-red-500" />;
        default:
            return <Icon name="Info" size={16} className="text-blue-500" />;
    }
};

export const Toast: React.FC<ToastType> = ({ id, message, type, action }) => {
    const { dismiss } = useToast();

    return (
        <div
            className={cn(
                "flex w-full max-w-[400px] items-start gap-3 p-3 rounded border shadow-lg overflow-hidden group transition-all",
                "bg-[#252526] border-[#3e3e3e] text-[#cccccc]", // VS Code dark theme colors
                "animate-toast-in"
            )}
        >
            <div className="shrink-0 mt-0.5">
                {getToastIcon(type)}
            </div>

            <div className="flex-1 text-xs leading-relaxed overflow-hidden">
                <p className="break-words">{message}</p>

                {action && (
                    <div className="mt-2.5 flex items-center gap-2">
                        <button
                            onClick={() => {
                                action.onClick();
                                dismiss(id);
                            }}
                            className="px-2.5 py-1 bg-[#007acc] hover:bg-[#0062a3] text-white rounded-[2px] font-medium transition-colors"
                        >
                            {action.label}
                        </button>
                    </div>
                )}
            </div>

            <button
                onClick={() => dismiss(id)}
                className="shrink-0 text-[#cccccc]/50 hover:text-[#cccccc] transition-colors p-0.5"
            >
                <Icon name="X" size={14} />
            </button>
        </div>
    );
};

export const ToastViewport: React.FC = () => {
    const { toasts } = useToast();

    return (
        <div className="fixed bottom-12 right-6 z-[1000] flex flex-col gap-2 w-full max-w-[400px] pointer-events-none">
            {toasts.map((t) => (
                <div key={t.id} className="pointer-events-auto">
                    <Toast {...t} />
                </div>
            ))}
        </div>
    );
};
