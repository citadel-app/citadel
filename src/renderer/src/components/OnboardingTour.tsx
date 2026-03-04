import React, { useEffect, useState, useCallback } from 'react';
import { X, ChevronRight, ChevronLeft, Sparkles } from 'lucide-react';

interface TourStep {
    target: string;   // data-tour-id value
    title: string;
    description: string;
    position: 'right' | 'bottom' | 'left' | 'top';
}

const TOUR_STEPS: TourStep[] = [
    {
        target: 'tour-browser',
        title: 'Browser',
        description: 'Your knowledge library. Browse, search, and organize all entries here.',
        position: 'right'
    },
    {
        target: 'tour-notebook',
        title: 'Notebooks',
        description: 'Write long-form notes and documentation with our rich text editor.',
        position: 'right'
    },
    {
        target: 'tour-kanban',
        title: 'Kanban Board',
        description: 'Visual task management — drag entries across status columns.',
        position: 'right'
    },
    {
        target: 'tour-editor',
        title: 'Code Editor',
        description: 'Monaco-powered editor for writing and running code snippets.',
        position: 'right'
    },
    {
        target: 'tour-source-control',
        title: 'Source Control',
        description: 'Git integration — commit, push, and track your changes.',
        position: 'right'
    },
    {
        target: 'tour-main-content',
        title: 'You\'re all set!',
        description: 'This is your main workspace area. Start by creating your first entry using Ctrl+N.',
        position: 'bottom'
    }
];

export const OnboardingTour: React.FC = () => {
    const [isActive, setIsActive] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});
    const [arrowStyle, setArrowStyle] = useState<React.CSSProperties>({});
    const [highlightStyle, setHighlightStyle] = useState<React.CSSProperties>({});

    useEffect(() => {
        const shouldShow = localStorage.getItem('codex-show-tour');
        if (shouldShow === 'true') {
            // Small delay so the layout renders first
            const timer = setTimeout(() => {
                setIsActive(true);
                localStorage.removeItem('codex-show-tour');
            }, 800);
            return () => clearTimeout(timer);
        }
    }, []);

    const positionTooltip = useCallback(() => {
        const step = TOUR_STEPS[currentStep];
        const el = document.querySelector(`[data-tour-id="${step.target}"]`);

        if (!el) {
            // Skip this step if element not found
            if (currentStep < TOUR_STEPS.length - 1) {
                setCurrentStep(s => s + 1);
            } else {
                completeTour();
            }
            return;
        }

        const rect = el.getBoundingClientRect();
        const pad = 12;
        const tooltipW = 300;
        const tooltipH = 140;

        // Highlight ring around target
        setHighlightStyle({
            position: 'fixed',
            top: rect.top - 4,
            left: rect.left - 4,
            width: rect.width + 8,
            height: rect.height + 8,
            borderRadius: '12px',
            border: '2px solid hsl(var(--primary))',
            boxShadow: '0 0 0 9999px rgba(0,0,0,0.5), 0 0 30px rgba(59,130,246,0.3)',
            zIndex: 9998,
            pointerEvents: 'none' as const,
            transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        });

        let top = 0, left = 0;
        let aTop = 0, aLeft = 0;
        const arrowSize = 8;

        switch (step.position) {
            case 'right':
                top = rect.top + rect.height / 2 - tooltipH / 2;
                left = rect.right + pad;
                aTop = tooltipH / 2 - arrowSize;
                aLeft = -arrowSize * 2;
                break;
            case 'bottom':
                top = rect.bottom + pad;
                left = rect.left + rect.width / 2 - tooltipW / 2;
                aTop = -arrowSize * 2;
                aLeft = tooltipW / 2 - arrowSize;
                break;
            case 'left':
                top = rect.top + rect.height / 2 - tooltipH / 2;
                left = rect.left - tooltipW - pad;
                aTop = tooltipH / 2 - arrowSize;
                aLeft = tooltipW;
                break;
            case 'top':
                top = rect.top - tooltipH - pad;
                left = rect.left + rect.width / 2 - tooltipW / 2;
                aTop = tooltipH;
                aLeft = tooltipW / 2 - arrowSize;
                break;
        }

        // Clamp to viewport
        top = Math.max(8, Math.min(top, window.innerHeight - tooltipH - 8));
        left = Math.max(8, Math.min(left, window.innerWidth - tooltipW - 8));

        setTooltipStyle({
            position: 'fixed',
            top,
            left,
            width: tooltipW,
            zIndex: 9999,
            transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        });

        setArrowStyle({
            position: 'absolute',
            top: aTop,
            left: aLeft,
            width: 0,
            height: 0,
        });
    }, [currentStep]);

    useEffect(() => {
        if (!isActive) return;
        positionTooltip();
        window.addEventListener('resize', positionTooltip);
        return () => window.removeEventListener('resize', positionTooltip);
    }, [isActive, currentStep, positionTooltip]);

    const completeTour = () => {
        setIsActive(false);
        localStorage.setItem('codex-tour-completed', 'true');
    };

    const handleNext = () => {
        if (currentStep < TOUR_STEPS.length - 1) {
            setCurrentStep(s => s + 1);
        } else {
            completeTour();
        }
    };

    const handlePrev = () => {
        if (currentStep > 0) {
            setCurrentStep(s => s - 1);
        }
    };

    if (!isActive) return null;

    const step = TOUR_STEPS[currentStep];
    const isLast = currentStep === TOUR_STEPS.length - 1;

    return (
        <>
            {/* Highlight ring */}
            <div style={highlightStyle} />

            {/* Tooltip */}
            <div
                style={tooltipStyle}
                className="rounded-2xl bg-card border border-primary/30 shadow-2xl shadow-primary/10 backdrop-blur-xl p-5 animate-in fade-in zoom-in-95 duration-300"
            >
                {/* Arrow indicator */}
                <div style={arrowStyle} />

                {/* Close */}
                <button
                    onClick={completeTour}
                    className="absolute top-3 right-3 p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                    title="Skip tour"
                >
                    <X className="w-3.5 h-3.5" />
                </button>

                {/* Content */}
                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-primary" />
                        <h3 className="text-sm font-black text-foreground">{step.title}</h3>
                    </div>
                    <p className="text-xs text-muted-foreground font-medium leading-relaxed">
                        {step.description}
                    </p>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-muted/30">
                    <div className="flex gap-1.5">
                        {TOUR_STEPS.map((_, i) => (
                            <div
                                key={i}
                                className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${i === currentStep ? 'bg-primary w-4' : i < currentStep ? 'bg-primary/40' : 'bg-muted'
                                    }`}
                            />
                        ))}
                    </div>
                    <div className="flex items-center gap-2">
                        {currentStep > 0 && (
                            <button
                                onClick={handlePrev}
                                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                        )}
                        <button
                            onClick={handleNext}
                            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-wider hover:bg-primary/90 transition-all active:scale-95"
                        >
                            {isLast ? 'Done' : 'Next'}
                            {!isLast && <ChevronRight className="w-3.5 h-3.5" />}
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};
