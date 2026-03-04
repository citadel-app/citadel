import React from 'react';
import logoMain from '../assets/branding/logo-main.png';

export const SplashScreen: React.FC = () => {
    return (
        <div
            className="fixed inset-0 flex flex-col items-center justify-center bg-background z-[9999]"
            style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
        >
            {/* Ambient glow */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[150px] animate-pulse" />
            </div>

            {/* Logo */}
            <div className="relative z-10 flex flex-col items-center gap-6 animate-in fade-in zoom-in-95 duration-700">
                <img
                    src={logoMain}
                    alt="Citadel"
                    className="w-24 h-24 object-contain drop-shadow-2xl"
                />
                <h1 className="text-3xl font-black tracking-tight text-foreground/90 italic">
                    Citadel
                </h1>

                {/* Loading spinner */}
                <div className="flex items-center gap-2 mt-4">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
            </div>
        </div>
    );
};
