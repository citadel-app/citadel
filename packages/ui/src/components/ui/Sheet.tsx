// @ts-nocheck
import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"
import { cn } from "../../lib/utils"

const Sheet = DialogPrimitive.Root

const SheetTrigger = DialogPrimitive.Trigger

const SheetClose = DialogPrimitive.Close

const SheetPortal = DialogPrimitive.Portal



const SheetOverlay = React.forwardRef<
    React.ElementRef<typeof DialogPrimitive.Overlay>,
    React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
    <DialogPrimitive.Overlay
        className={cn(
            "fixed inset-0 top-[var(--titlebar-height,0px)] bottom-[var(--statusbar-height,0px)] z-50 bg-background/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            className
        )}
        {...props}
        ref={ref}
    />
))
SheetOverlay.displayName = DialogPrimitive.Overlay.displayName

interface SheetContentProps
    extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
    side?: "top" | "bottom" | "left" | "right";
    size?: "default" | "sm" | "md" | "lg" | "xl" | "full" | "content";
}



const SheetContent = React.forwardRef<React.ElementRef<typeof DialogPrimitive.Content>, SheetContentProps>(({ side = "right", size = "default", className, children, ...props }, ref) => (
    <SheetPortal>
        <SheetOverlay />
        <DialogPrimitive.Content
            ref={ref}
            className={cn(
                "fixed z-50 flex flex-col bg-background shadow-lg transition ease-in-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:duration-300 data-[state=open]:duration-500",
                // Side orientations
                side === "right" && "top-[var(--titlebar-height,0px)] bottom-[var(--statusbar-height,0px)] right-0 h-[calc(100%-var(--titlebar-height,0px)-var(--statusbar-height,0px)) as unknown as (props: SheetContentProps & React.RefAttributes<React.ElementRef<typeof DialogPrimitive.Content>>) => React.ReactNode] border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right",
                side === "left" && "top-[var(--titlebar-height,0px)] bottom-[var(--statusbar-height,0px)] left-0 h-[calc(100%-var(--titlebar-height,0px)-var(--statusbar-height,0px))] border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left",
                side === "top" && "top-[var(--titlebar-height,0px)] left-0 right-0 border-b data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top",
                side === "bottom" && "bottom-[var(--statusbar-height,0px)] left-0 right-0 border-t data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",

                // Size variants for horizontal sheets (left/right)
                (side === "left" || side === "right") && [
                    size === "default" && "w-3/4 sm:max-w-md",
                    size === "sm" && "w-3/4 sm:max-w-sm",
                    size === "md" && "w-3/4 sm:max-w-md",
                    size === "lg" && "w-3/4 sm:max-w-2xl",
                    size === "xl" && "w-3/4 sm:max-w-5xl",
                    size === "full" && "w-screen",
                    size === "content" && "w-auto min-w-[200px]"
                ],

                // Size variants for vertical sheets (top/bottom)
                (side === "top" || side === "bottom") && [
                    size === "default" && "h-1/3",
                    size === "sm" && "h-1/4",
                    size === "md" && "h-1/3",
                    size === "lg" && "h-1/2",
                    size === "xl" && "h-2/3",
                    size === "full" && "h-full",
                    size === "content" && "h-auto"
                ],

                className
            )}
            {...props}
        >
            {children}
            <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-secondary">
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
        </DialogPrimitive.Content>
    </SheetPortal>
))
SheetContent.displayName = DialogPrimitive.Content.displayName

const SheetHeader = ({
    className,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
    <div
        className={cn(
            "flex flex-col space-y-2 text-center sm:text-left px-6 py-4 border-b border-border",
            className
        )}
        {...props}
    />
)
SheetHeader.displayName = "SheetHeader"

const SheetBody = ({
    className,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
    <div
        className={cn(
            "flex-1 overflow-y-auto px-6 py-4",
            className
        )}
        {...props}
    />
)
SheetBody.displayName = "SheetBody"

const SheetFooter = ({
    className,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
    <div
        className={cn(
            "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 px-6 py-4 border-t border-border bg-background/50 backdrop-blur-sm mt-auto",
            className
        )}
        {...props}
    />
)
SheetFooter.displayName = "SheetFooter"



const SheetTitle = React.forwardRef<
    React.ElementRef<typeof DialogPrimitive.Title>,
    React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
    <DialogPrimitive.Title
        ref={ref}
        className={cn("text-lg font-semibold text-foreground", className)}
        {...props}
    />
))
SheetTitle.displayName = DialogPrimitive.Title.displayName



const SheetDescription = React.forwardRef<
    React.ElementRef<typeof DialogPrimitive.Description>,
    React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
    <DialogPrimitive.Description
        ref={ref}
        className={cn("text-sm text-muted-foreground", className)}
        {...props}
    />
))
SheetDescription.displayName = DialogPrimitive.Description.displayName

export {
    Sheet,
    SheetTrigger,
    SheetClose,
    SheetContent,
    SheetHeader,
    SheetBody,
    SheetFooter,
    SheetTitle,
    SheetDescription,
}
