import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../../lib/utils"

const radioVariants = cva(
    "peer appearance-none rounded-full border border-input bg-background transition-premium checked:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
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

const radioInnerVariants = cva(
    "absolute rounded-full bg-primary opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none",
    {
        variants: {
            size: {
                sm: "w-2 h-2",
                default: "w-2.5 h-2.5",
                lg: "w-3 h-3",
            },
        },
        defaultVariants: {
            size: "default",
        },
    }
)

export interface RadioGroupProps extends React.HTMLAttributes<HTMLDivElement> {
    value?: string;
    onValueChange?: (value: string) => void;
    size?: "sm" | "default" | "lg";
}

const RadioGroup = React.forwardRef<HTMLDivElement, RadioGroupProps>(
    ({ className, value, onValueChange, size = "default", children, ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={cn("grid gap-2", className)}
                role="radiogroup"
                {...props}
            >
                {React.Children.map(children, (child) => {
                    if (React.isValidElement(child)) {
                        const radioChild = child as React.ReactElement<any>;
                        return React.cloneElement(radioChild, {
                            checked: radioChild.props.value === value,
                            onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
                                radioChild.props.onChange?.(e);
                                onValueChange?.(radioChild.props.value);
                            },
                            size: radioChild.props.size || size,
                        })
                    }
                    return child
                })}
            </div>
        )
    }
)
RadioGroup.displayName = "RadioGroup"

export interface RadioGroupItemProps
    extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size">,
    VariantProps<typeof radioVariants> {
    label?: string;
    value: string;
}

const RadioGroupItem = React.forwardRef<HTMLInputElement, RadioGroupItemProps>(
    ({ className, label, value, checked, onChange, size, ...props }, ref) => {
        return (
            <label className={cn("flex items-center gap-3 cursor-pointer group", className)}>
                <div className="relative flex items-center justify-center">
                    <input
                        type="radio"
                        value={value}
                        checked={checked}
                        onChange={onChange}
                        className={cn(radioVariants({ size }))}
                        ref={ref}
                        {...props}
                    />
                    <div className={cn(radioInnerVariants({ size }))} />
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
RadioGroupItem.displayName = "RadioGroupItem"

export { RadioGroup, RadioGroupItem }
