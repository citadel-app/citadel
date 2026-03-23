import * as React from "react"
import { type VariantProps, cva } from "class-variance-authority"
import { cn } from "../../lib/utils"

const textareaVariants = cva(
    "flex min-h-[80px] w-full rounded-[var(--radius-base)] border border-input bg-background text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-premium",
    {
        variants: {
            variant: {
                default: "border-input focus:border-primary/50 focus:shadow-citadel",
                ghost: "border-transparent bg-transparent hover:bg-muted focus:bg-background focus:border-primary/50",
            },
            size: {
                sm: "min-h-[60px] px-2 py-1 text-xs",
                default: "px-3 py-2",
                lg: "min-h-[120px] px-4 py-3 text-base",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
        },
    }
)

export interface TextareaProps
    extends React.TextareaHTMLAttributes<HTMLTextAreaElement>,
    VariantProps<typeof textareaVariants> { }

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
    ({ className, variant, size, ...props }, ref) => {
        return (
            <textarea
                className={cn(textareaVariants({ variant, size, className }))}
                ref={ref}
                {...props}
            />
        )
    }
)
Textarea.displayName = "Textarea"

export { Textarea, textareaVariants }
