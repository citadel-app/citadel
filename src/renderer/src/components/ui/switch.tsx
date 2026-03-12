import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../../lib/utils"

const switchVariants = cva(
    "relative inline-flex shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-premium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-muted",
    {
        variants: {
            size: {
                sm: "h-4 w-7",
                default: "h-5 w-9",
                lg: "h-6 w-11",
            },
        },
        defaultVariants: {
            size: "default",
        },
    }
)

const thumbVariants = cva(
    "pointer-events-none block rounded-full bg-white shadow-lg ring-0 transition-premium data-[state=unchecked]:translate-x-0",
    {
        variants: {
            size: {
                sm: "h-3 w-3 data-[state=checked]:translate-x-3",
                default: "h-4 w-4 data-[state=checked]:translate-x-4",
                lg: "h-5 w-5 data-[state=checked]:translate-x-5",
            },
        },
        defaultVariants: {
            size: "default",
        },
    }
)

export interface SwitchProps
    extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size">,
    VariantProps<typeof switchVariants> {
    label?: string;
    onCheckedChange?: (checked: boolean) => void;
}

const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
    ({ className, label, size, checked, defaultChecked, onCheckedChange, onChange, ...props }, ref) => {
        const [isInternalChecked, setIsInternalChecked] = React.useState(checked ?? defaultChecked ?? false);

        React.useEffect(() => {
            if (checked !== undefined) setIsInternalChecked(checked);
        }, [checked]);

        const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            const newChecked = e.target.checked;
            if (checked === undefined) setIsInternalChecked(newChecked);
            onChange?.(e);
            onCheckedChange?.(newChecked);
        };

        const state = isInternalChecked ? "checked" : "unchecked";

        return (
            <label className={cn("flex items-center gap-3 cursor-pointer group", className)}>
                <div
                    className={cn(switchVariants({ size }))}
                    data-state={state}
                >
                    <input
                        type="checkbox"
                        className="sr-only"
                        ref={ref}
                        checked={isInternalChecked}
                        onChange={handleChange}
                        {...props}
                    />
                    <span
                        className={cn(thumbVariants({ size }))}
                        data-state={state}
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
Switch.displayName = "Switch"

export { Switch }
