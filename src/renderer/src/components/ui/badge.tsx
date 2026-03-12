import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../../lib/utils"
import { Icon } from "../IconRegistry"

const badgeVariants = cva(
    "inline-flex items-center rounded-full font-semibold transition-premium focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
    {
        variants: {
            variant: {
                default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80 shadow-citadel",
                secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
                destructive: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
                outline: "text-foreground border border-border hover:bg-accent",
                tag: "bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20",
                metadata: "bg-muted text-muted-foreground border border-border/50 hover:bg-muted/80",
                premium: "bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 font-medieval tracking-wide",
            },
            size: {
                sm: "px-2 py-0.5 text-[10px]",
                default: "px-2.5 py-0.5 text-xs",
                lg: "px-3 py-1 text-sm",
            }
        },
        defaultVariants: {
            variant: "default",
            size: "default",
        },
    }
)

export interface BadgeProps
    extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
    icon?: string;
}

function Badge({ className, variant, size, icon, children, ...props }: BadgeProps) {
    return (
        <div className={cn(badgeVariants({ variant, size }), className)} {...props}>
            {icon && (
                <Icon
                    name={icon}
                    size={size === 'sm' ? 8 : size === 'lg' ? 12 : 10}
                    className={cn("opacity-70", children ? "mr-1.5" : "")}
                />
            )}
            {children}
        </div>
    )
}

export { Badge, badgeVariants }
