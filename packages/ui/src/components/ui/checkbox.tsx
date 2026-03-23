import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../../lib/utils"
import { Icon } from "../IconRegistry"

const checkboxVariants = cva(
    "peer shrink-0 appearance-none rounded border border-input bg-background transition-premium checked:bg-primary checked:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
    {
        variants: {
            size: {
                sm: "h-4 w-4",
                default: "h-5 w-5",
                lg: "h-6 w-6",
            },
        },
        defaultVariants: {
            size: "default",
        },
    }
)

export interface CheckboxProps
    extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size">,
    VariantProps<typeof checkboxVariants> {
    label?: string;
    onCheckedChange?: (checked: boolean) => void;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
    ({ className, label, size, onCheckedChange, onChange, ...props }, ref) => {
        const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            onChange?.(e);
            onCheckedChange?.(e.target.checked);
        };

        return (
            <label className={cn("flex items-center gap-3 cursor-pointer group", className)}>
                <div className="relative flex items-center justify-center">
                    <input
                        type="checkbox"
                        className={cn(checkboxVariants({ size }))}
                        ref={ref}
                        onChange={handleChange}
                        {...props}
                    />
                    <Icon
                        name="Check"
                        size={size === 'sm' ? 10 : size === 'lg' ? 14 : 12}
                        strokeWidth={4}
                        className="absolute text-primary-foreground opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none"
                    />
                </div>
                {label && (
                    <span className={cn(
                        "font-medium text-foreground/80 group-hover:text-foreground transition-colors",
                        size === 'sm' ? "text-xs" : size === 'lg' ? "text-base" : "text-sm"
                    )}>
                        {label}
                    </span>
                )}
            </label>
        )
    }
)
Checkbox.displayName = "Checkbox"

export { Checkbox }
