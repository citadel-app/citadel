import * as React from "react"
import { ChevronDown } from "lucide-react"
import { Button, type ButtonProps } from "./button"
import { cn } from "../../lib/utils"
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
} from "./dropdown-menu"

export interface SplitButtonProps extends Omit<ButtonProps, 'onClick'> {
    onMainClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
    onDropdownClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
    dropdownContent?: React.ReactNode;
}

const SplitButton = React.forwardRef<HTMLDivElement, SplitButtonProps>(
    ({ className, variant, theme, size, shape, onMainClick, onDropdownClick, children, icon, dropdownContent, ...props }, ref) => {
        const isForged = theme === 'forged';

        return (
            <DropdownMenu>
                <div
                    ref={ref}
                    className={cn(
                        "inline-flex items-stretch",
                        isForged ? "gap-0" : "-space-x-px",
                        className
                    )}
                >
                    <Button
                        variant={variant}
                        theme={theme}
                        size={size}
                        shape={isForged ? shape : (shape === 'pill' ? 'pill' : 'default')}
                        onClick={onMainClick}
                        icon={icon}
                        forgedPiece={isForged ? 'left' : undefined}
                        className={cn(
                            "relative z-10",
                            !isForged && (shape === 'pill' ? "rounded-r-none pr-3" : "rounded-r-none")
                        )}
                        {...props}
                    >
                        {children}
                    </Button>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant={variant}
                            theme={theme}
                            size={
                                (size === 'xs' ? 'icon-xs' :
                                    size === 'sm' ? 'icon-sm' :
                                        size === 'lg' ? 'icon-lg' :
                                            size === 'xl' ? 'icon-xl' :
                                                size === '2xl' ? 'icon-2xl' :
                                                    'icon') as any
                            }
                            shape={isForged ? shape : (shape === 'pill' ? 'pill' : 'default')}
                            onClick={onDropdownClick}
                            forgedPiece={isForged ? 'right' : undefined}
                            className={cn(
                                "min-w-0 flex items-center justify-center",
                                !isForged && (shape === 'pill' ? "rounded-l-none pl-0.5" : "rounded-l-none")
                            )}
                        >
                            <ChevronDown className={cn(
                                size === 'xs' ? "h-3 w-3" :
                                    size === 'sm' ? "h-3.5 w-3.5" :
                                        size === 'lg' ? "h-5 w-5" :
                                            "h-4 w-4"
                            )} />
                        </Button>
                    </DropdownMenuTrigger>
                </div>
                {dropdownContent && (
                    <DropdownMenuContent align="end">
                        {dropdownContent}
                    </DropdownMenuContent>
                )}
            </DropdownMenu>
        )
    }
)
SplitButton.displayName = "SplitButton"

export { SplitButton }
