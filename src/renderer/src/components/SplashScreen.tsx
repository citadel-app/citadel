/// <reference types="vite/client" />
import React from 'react';
import bannerImg from '../assets/branding/banner.png';

export const SplashScreen: React.FC = () => {
    return (
        <div
            className="fixed inset-0 flex items-center justify-center bg-transparent z-[9999]"
            style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
        >
            <div className="relative animate-in fade-in zoom-in-95 duration-1000">
                <img
                    src={bannerImg}
                    alt="Citadel"
                    className="w-[800px] object-contain drop-shadow-[0_20px_50px_rgba(0,0,0,0.3)]"
                />
            </div>
        </div>
    );
};
