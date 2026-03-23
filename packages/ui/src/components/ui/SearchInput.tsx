import * as React from "react"
import { Icon } from "../IconRegistry"
import { cn } from "../../lib/utils"
import { type VariantProps } from "class-variance-authority"
import { inputVariants } from "./input"

export interface SearchInputProps
    extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size">,
    VariantProps<typeof inputVariants> {
    onClear?: () => void;
}

const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
    ({ className, variant, size, value, onChange, onClear, placeholder = "Search...", ...props }, ref) => {
        return (
            <div className={cn("relative flex items-center group w-full", className)}>
                <Icon
                    name="Search"
                    size={size === "sm" ? 12 : size === "lg" ? 16 : 14}
                    className={cn(
                        "absolute text-muted-foreground group-focus-within:text-primary transition-colors pointer-events-none",
                        size === "sm" ? "left-2.5" : size === "lg" ? "left-4" : "left-3"
                    )}
                />
                <input
                    className={cn(
                        inputVariants({ variant, size }),
                        size === "sm" ? "pl-8 pr-10" : size === "lg" ? "pl-11 pr-12" : "pl-9 pr-10",
                        "w-full"
                    )}
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    ref={ref}
                    {...props}
                />
                {value && (
                    <button
                        type="button"
                        onClick={onClear}
                        className={cn(
                            "absolute text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-muted p-1",
                            size === "sm" ? "right-2" : size === "lg" ? "right-4" : "right-3"
                        )}
                    >
                        <Icon name="X" size={size === "sm" ? 10 : size === "lg" ? 14 : 12} />
                    </button>
                )}
            </div>
        )
    }
)
SearchInput.displayName = "SearchInput"

export { SearchInput }
