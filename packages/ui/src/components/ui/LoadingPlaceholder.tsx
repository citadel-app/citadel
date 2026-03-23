import React from 'react';

interface LoadingPlaceholderProps {
    message?: string;
    fullScreen?: boolean;
    bannerImgSrc?: string;
}

export const LoadingPlaceholder = ({ fullScreen = false, message = 'Loading workspace...', bannerImgSrc }: LoadingPlaceholderProps) => {
    return (
        <div className={`flex flex-col items-center justify-center p-8 bg-background/50 backdrop-blur-sm transition-opacity duration-500 ${fullScreen ? 'fixed inset-0 z-[100]' : 'h-full w-full'}`}>
            <div className="relative animate-in fade-in zoom-in-95 duration-700">
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-[80px] animate-pulse" />
                <img
                    src={bannerImgSrc}
                    alt="Loading"
                    className="w-64 object-contain relative z-10 opacity-80 drop-shadow-2xl"
                />
            </div>
            {message && (
                <p className="mt-8 text-sm font-medium text-primary tracking-widest uppercase animate-pulse z-10">
                    {message}
                </p>
            )}
        </div>
    );
};
