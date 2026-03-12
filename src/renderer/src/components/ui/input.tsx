import * as React from "react"
import { type VariantProps, cva } from "class-variance-authority"
import { cn } from "../../lib/utils"

const inputVariants = cva(
    "flex w-full rounded-[var(--radius-base)] border border-input bg-background text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-premium",
    {
        variants: {
            variant: {
                default: "border-input focus:border-primary/50 focus:shadow-citadel",
                ghost: "border-transparent bg-transparent hover:bg-muted focus:bg-background focus:border-primary/50",
                pill: "rounded-full focus:ring-primary/30",
            },
            size: {
                sm: "h-9 px-2 text-xs",
                default: "h-10 px-3 py-2",
                lg: "h-12 px-4 text-base",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
        },
    }
)

export interface InputProps
    extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size">,
    VariantProps<typeof inputVariants> { }

const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, variant, size, type, ...props }, ref) => {
        return (
            <input
                type={type}
                className={cn(inputVariants({ variant, size, className }))}
                ref={ref}
                {...props}
            />
        )
    }
)
Input.displayName = "Input"

export { Input, inputVariants }
