import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { type VariantProps, cva } from "class-variance-authority"
import { cn } from "../../lib/utils"
import { Icon } from "../IconRegistry"

const buttonVariants = cva(
    "inline-flex items-center justify-center whitespace-nowrap text-sm font-medium ring-offset-background transition-premium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-95 hover:scale-[1.02]",
    {
        variants: {
            variant: {
                default: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-citadel",
                destructive:
                    "bg-destructive text-destructive-foreground hover:bg-destructive/90",
                outline:
                    "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
                secondary:
                    "bg-secondary text-secondary-foreground hover:bg-secondary/80",
                ghost: "hover:bg-accent hover:text-accent-foreground",
                link: "text-primary underline-offset-4 hover:underline",
            },
            theme: {
                standard: "", // No-op, uses variant as-is
                forged: "btn-forged",
                premium: "shadow-citadel border border-primary/20",
            },
            size: {
                xs: "h-7 px-2 text-[10px]",
                sm: "h-9 px-3 text-xs",
                default: "h-10 px-4 py-2",
                lg: "h-12 px-8 text-base",
                xl: "h-14 px-10 text-lg",
                "2xl": "h-20 px-12 text-xl font-bold",
                icon: "h-10 w-10",
                "icon-xl": "h-14 w-14",
                "icon-2xl": "h-20 w-20",
                "icon-lg": "h-12 w-12",
                "icon-sm": "h-9 w-9",
                "icon-xs": "h-7 w-7",
            },
            shape: {
                default: "rounded-[var(--radius-base)]",
                pill: "rounded-full",
                xl: "rounded-[var(--radius-xl)]",
                "2xl": "rounded-[var(--radius-2xl)]",
                none: "",
            }
        },
        compoundVariants: [
            // Handle Forged + Semantic Color variants
            {
                theme: "forged",
                variant: "default",
                className: "!bg-primary/25 !text-primary hover:!bg-primary/35 shadow-none border-none",
            },
            {
                theme: "forged",
                variant: "secondary",
                className: "!bg-secondary/40 !text-secondary-foreground hover:!bg-secondary/60 shadow-none border-none",
            },
            {
                theme: "forged",
                variant: "destructive",
                className: "!bg-destructive/30 !text-destructive-foreground hover:!bg-destructive/50 shadow-none border-none",
            },
            {
                theme: "forged",
                variant: "outline",
                className: "!bg-transparent hover:!bg-primary/10 variant-outline shadow-none border-none",
            },
            {
                theme: "forged",
                variant: "ghost",
                className: "!bg-transparent hover:!bg-accent/30 variant-ghost shadow-none border-none",
            },
            // Handle Premium + Sementic Color variants (mainly background gradients)
            {
                theme: "premium",
                variant: "default",
                className: "bg-gradient-to-r from-primary to-primary/80 text-primary-foreground",
            },
            {
                theme: "premium",
                variant: "secondary",
                className: "bg-gradient-to-r from-secondary to-muted text-secondary-foreground",
            },
            // Disable rounding when Forged is active since it uses clip-path
            {
                theme: "forged",
                className: "rounded-none",
            }
        ],
        defaultVariants: {
            variant: "default",
            theme: "standard",
            size: "default",
            shape: "default",
        },
    }
)

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
    asChild?: boolean
    icon?: string
    iconSize?: number
    forgedPiece?: 'left' | 'right'
    iconAnimate?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant, theme, size, shape, asChild = false, icon, iconSize, forgedPiece, children, iconAnimate, ...props }, ref) => {
        const Comp = asChild ? Slot : "button"

        // Handle forged variant separately as it needs specific padding and clip-path
        const isForged = theme === 'forged';

        // Auto-detect icon size if not specified
        const finalIconSize = iconSize || (
            size === 'xs' || size === 'icon-xs' ? 12 :
                size === 'sm' || size === 'icon-sm' ? 14 :
                    size === 'lg' || size === 'icon-lg' ? 20 :
                        size === 'xl' || size === 'icon-xl' ? 24 :
                            size === '2xl' || size === 'icon-2xl' ? 32 :
                                16 // default
        );

        const forgedPath = forgedPiece === 'left'
            ? "M 100 0 L 5 0 L 0 50 L 5 100 L 100 100"
            : forgedPiece === 'right'
                ? "M 0 0 L 95 0 L 100 50 L 95 100 L 0 100"
                : "M 5 0 L 95 0 L 100 50 L 95 100 L 5 100 L 0 50 Z";

        return (
            <Comp
                className={cn(
                    buttonVariants({ variant, theme, size, shape, className }),
                    isForged && (children ? "px-6" : "px-0"),
                    isForged && "relative border-none overflow-visible active:scale-95",
                    isForged && forgedPiece === 'left' && "clip-path-forged-left",
                    isForged && forgedPiece === 'right' && "clip-path-forged-right",
                    variant === 'destructive' && "variant-destructive",
                    variant === 'secondary' && "variant-secondary",
                    variant === 'outline' && "variant-outline",
                    variant === 'ghost' && "variant-ghost"
                )}
                ref={ref}
                {...props}
            >
                {isForged && (
                    <svg
                        className="absolute inset-0 w-full h-full pointer-events-none"
                        viewBox="0 0 100 100"
                        preserveAspectRatio="none"
                        aria-hidden="true"
                    >
                        <path
                            d={forgedPath}
                            className="forged-border-svg"
                        />
                    </svg>
                )}
                {icon && <Icon name={icon} size={finalIconSize} className={cn("relative z-10 shrink-0", children ? "mr-2" : "", iconAnimate && "animate-spin")} />}
                {children}
            </Comp>
        )
    }
)
Button.displayName = "Button"

export { Button, buttonVariants }
