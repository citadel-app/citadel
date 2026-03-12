import * as React from "react"
import { Button, type ButtonProps } from "./button"
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
} from "./dropdown-menu"

export interface IconButtonProps extends ButtonProps {
    dropdownContent?: React.ReactNode;
}

const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
    ({ dropdownContent, size = "icon", ...props }, ref) => {
        const button = (
            <Button
                ref={ref}
                size={size}
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
