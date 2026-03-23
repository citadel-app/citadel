import * as React from "react"
import { Icon } from "../IconRegistry"
import { cn } from "../../lib/utils"

export interface IconLabelProps extends React.HTMLAttributes<HTMLDivElement> {
    icon: string;
    iconSize?: number;
    iconClassName?: string;
    label: string;
    vertical?: boolean;
}

const IconLabel = React.forwardRef<HTMLDivElement, IconLabelProps>(
    ({ className, icon, iconSize = 14, iconClassName, label, vertical = false, ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={cn(
                    "flex items-center gap-2",
                    vertical && "flex-col items-center gap-1",
                    className
                )}
                {...props}
            >
                <Icon name={icon} size={iconSize} className={iconClassName} />
                <span className="text-sm font-medium">{label}</span>
            </div>
        )
    }
)
IconLabel.displayName = "IconLabel"

export { IconLabel }
