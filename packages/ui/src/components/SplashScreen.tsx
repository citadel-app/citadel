/// <reference types="vite/client" />
import React from 'react';
export const SplashScreen: React.FC<{ logoSrc?: string }> = ({ logoSrc }) => {
    return (
        <div
            className="fixed inset-0 flex items-center justify-center bg-transparent z-[9999]"
            style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
        >
            <div className="relative animate-in fade-in zoom-in-95 duration-1000">
                {logoSrc ? (
                    <img
                        src={logoSrc}
                        alt="Citadel"
                        className="w-[800px] object-contain drop-shadow-[0_20px_50px_rgba(0,0,0,0.3)]"
                    />
                ) : (
                    <div className="w-[800px] h-[300px] flex items-center justify-center text-primary/30">
                        <svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M22 4v4l-7-5-7 5V4"/><path d="M7 16V4"/><path d="M17 16V8"/></svg>
                    </div>
                )}
            </div>
        </div>
    );
};
