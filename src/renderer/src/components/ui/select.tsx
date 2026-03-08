import * as React from "react"
import { type VariantProps, cva } from "class-variance-authority"
import { cn } from "../../lib/utils"
import { Icon } from "../IconRegistry"

const selectVariants = cva(
    "flex w-full appearance-none rounded-[var(--radius-base)] border border-input bg-background text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-premium",
    {
        variants: {
            variant: {
                default: "border-input focus:border-primary/50 focus:shadow-citadel",
                ghost: "border-transparent bg-transparent hover:bg-muted focus:bg-background focus:border-primary/50",
            },
            size: {
                sm: "h-9 px-2 pr-8 text-xs",
                default: "h-10 px-3 py-2 pr-10",
                lg: "h-12 px-4 pr-12 text-base",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
        },
    }
)

export interface SelectProps
    extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "size">,
    VariantProps<typeof selectVariants> { }

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
    ({ className, variant, size, children, ...props }, ref) => {
        return (
            <div className="relative">
                <select
                    className={cn(selectVariants({ variant, size, className }))}
                    ref={ref}
                    {...props}
                >
                    {children}
                </select>
                <Icon
                    name="ChevronDown"
                    size={size === "sm" ? 12 : size === "lg" ? 16 : 14}
                    className={cn(
                        "absolute top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none",
                        size === "sm" ? "right-2" : size === "lg" ? "right-4" : "right-3"
                    )}
                />
            </div>
        )
    }
)
Select.displayName = "Select"

export { Select, selectVariants }
