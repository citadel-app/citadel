import * as React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./dialog"
import { cn } from "../../lib/utils"

interface CitadelDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    title?: string
    description?: string
    children: React.ReactNode
    className?: string
    maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl" | "full"
    theme?: "standard" | "forged" | "premium" | "outline"
    width?: "fixed" | "flexible"
}

export const CitadelDialog = ({
    open,
    onOpenChange,
    title,
    description,
    children,
    className,
    maxWidth = "lg",
    theme = "premium",
    width = "fixed"
}: CitadelDialogProps) => {
    const maxWidthClasses = {
        sm: "max-w-sm",
        md: "max-w-md",
        lg: "max-w-lg",
        xl: "max-w-xl",
        "2xl": "max-w-2xl",
        "3xl": "max-w-3xl",
        "4xl": "max-w-4xl",
        "5xl": "max-w-5xl",
        full: "max-w-[95vw]",
    }

    const isForged = theme === "forged";
    const isPremium = theme === "premium";
    const isOutline = theme === "outline";

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className={cn(
                    "flex flex-col max-h-[90vh] overflow-hidden border-border/50 shadow-2xl transition-all duration-300",
                    width === "fixed" ? "w-full" : "w-fit",
                    isPremium && "rounded-[var(--radius-2xl)] backdrop-blur-md bg-background/95",
                    isForged && "border-none bg-background/90 backdrop-blur-sm clip-path-forged-dialog p-0",
                    theme === "standard" && "rounded-lg bg-background border p-0",
                    isOutline && "rounded-xl bg-background border shadow-xl p-0",
                    maxWidthClasses[maxWidth],
                    className
                )}
            >
                {isForged && (
                    <svg
                        className="absolute inset-0 w-full h-full pointer-events-none z-50"
                        viewBox="0 0 100 100"
                        preserveAspectRatio="none"
                        aria-hidden="true"
                    >
                        <polygon
                            points="2,0 98,0 100,5 100,95 98,100 2,100 0,95 0,5"
                            className="forged-dialog-border"
                        />
                    </svg>
                )}

                {/* Fixed Header */}
                {(title || description) && (
                    <DialogHeader className={cn(
                        "relative z-10 shrink-0",
                        isOutline ? "px-6 py-4 border-b border-border/50 bg-muted/5" : "px-8 pt-8 pb-4",
                        isForged && "text-center sm:text-center"
                    )}>
                        {title && (
                            <DialogTitle className={cn(
                                isOutline ? "text-lg font-semibold" : "text-2xl tracking-wide text-primary",
                                (isForged || isPremium) ? "font-medieval uppercase" : ""
                            )}>
                                {title}
                            </DialogTitle>
                        )}
                        {description && (
                            <DialogDescription className={cn(
                                "mt-1",
                                isOutline ? "text-xs" : "text-muted-foreground italic"
                            )}>
                                {description}
                            </DialogDescription>
                        )}
                    </DialogHeader>
                )}

                {/* Scrollable Body */}
                <div className={cn(
                    "relative z-10 overflow-y-auto custom-scrollbar flex-grow",
                    isOutline ? "p-6" : ((title || description) ? "px-8 pb-8 pt-2" : "p-8")
                )}>
                    {children}
                </div>
            </DialogContent>
        </Dialog>
    )
}
