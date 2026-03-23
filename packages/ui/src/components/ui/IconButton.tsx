import * as React from "react"
import { Button, type ButtonProps } from "./button"
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
} from "./dropdown-menu"

export interface IconButtonProps extends ButtonProps {
    dropdownContent?: React.ReactNode;
    iconAnimate?: boolean;
}

const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
    ({ dropdownContent, size = "icon", iconAnimate, ...props }, ref) => {
        const button = (
            <Button
                ref={ref}
                size={size}
                iconAnimate={iconAnimate}
                {...props}
            />
        )

        if (!dropdownContent) {
            return button
        }

        return (
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    {button}
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    {dropdownContent}
                </DropdownMenuContent>
            </DropdownMenu>
        )
    }
)
IconButton.displayName = "IconButton"

export { IconButton }
