import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../../lib/utils"

const toggleVariants = cva(
    "inline-flex items-center justify-center text-sm font-medium ring-offset-background transition-premium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-95 hover:scale-[1.02] data-[state=on]:shadow-inner",
    {
        variants: {
            variant: {
                default: "bg-transparent hover:bg-muted hover:text-muted-foreground data-[state=on]:bg-primary data-[state=on]:text-primary-foreground",
                outline: "border border-input bg-transparent hover:bg-accent hover:text-accent-foreground data-[state=on]:bg-accent data-[state=on]:text-accent-foreground",
                secondary: "bg-secondary/40 text-secondary-foreground hover:bg-secondary/60 data-[state=on]:bg-secondary data-[state=on]:text-secondary-foreground",
                ghost: "hover:bg-accent hover:text-accent-foreground data-[state=on]:bg-accent/50",
            },
            theme: {
                standard: "",
                forged: "btn-forged",
                premium: "shadow-citadel border border-primary/20",
            },
            size: {
                sm: "h-9 px-2.5",
                default: "h-10 px-3",
                lg: "h-12 px-5",
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
            // Handle Forged + On State logic
            {
                theme: "forged",
                className: "rounded-none data-[state=on]:!bg-primary/40 data-[state=on]:!text-primary shadow-none border-none",
            },
            // Handle Premium + On State logic
            {
                theme: "premium",
                className: "data-[state=on]:bg-gradient-to-r data-[state=on]:from-primary data-[state=on]:to-primary/80 data-[state=on]:text-primary-foreground",
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

export interface ToggleProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof toggleVariants> {
    pressed?: boolean;
    onPressedChange?: (pressed: boolean) => void;
}

const Toggle = React.forwardRef<HTMLButtonElement, ToggleProps>(
    ({ className, variant, theme, size, shape, pressed, onPressedChange, onClick, children, ...props }, ref) => {
        const isForged = theme === 'forged';

        const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
            onPressedChange?.(!pressed);
            onClick?.(e);
        };

        return (
            <button
                type="button"
                data-state={pressed ? "on" : "off"}
                className={cn(
                    toggleVariants({ variant, theme, size, shape, className }),
                    isForged && "relative border-none overflow-visible",
                    variant === 'outline' && "variant-outline",
                    variant === 'ghost' && "variant-ghost"
                )}
                onClick={handleClick}
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
                        <polygon
                            points="5,0 95,0 100,50 95,100 5,100 0,50"
                            className="forged-border-svg"
                        />
                    </svg>
                )}
                <span className="relative z-10 flex items-center justify-center">
                    {children}
                </span>
            </button>
        )
    }
)
Toggle.displayName = "Toggle"

export { Toggle, toggleVariants }
