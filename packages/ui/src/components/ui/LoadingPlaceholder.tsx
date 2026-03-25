import React from 'react';

interface LoadingPlaceholderProps {
    message?: string;
    fullScreen?: boolean;
    bannerImgSrc?: string;
}

export const LoadingPlaceholder = ({ fullScreen = false, message = 'Loading workspace...', bannerImgSrc }: LoadingPlaceholderProps) => {
    return (
        <div className={`flex flex-col items-center justify-center p-8 bg-background/50 backdrop-blur-sm transition-opacity duration-500 ${fullScreen ? 'fixed inset-0 z-[100]' : 'h-full w-full'}`}>
            <div className="relative animate-in fade-in zoom-in-95 duration-700 flex items-center justify-center">
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-[80px] animate-pulse" />
                {bannerImgSrc ? (
                    <img
                        src={bannerImgSrc}
                        alt="Loading"
                        className="w-64 object-contain relative z-10 opacity-80 drop-shadow-2xl"
                    />
                ) : (
                    <div className="text-primary/50 relative z-10">
                        <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M22 4v4l-7-5-7 5V4"/><path d="M7 16V4"/><path d="M17 16V8"/></svg>
                    </div>
                )}
            </div>
            {message && (
                <p className="mt-8 text-sm font-medium text-primary tracking-widest uppercase animate-pulse z-10">
                    {message}
                </p>
            )}
        </div>
    );
};
