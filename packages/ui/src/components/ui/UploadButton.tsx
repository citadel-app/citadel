import React from 'react';
import { Button, ButtonProps } from './button';

export interface UploadButtonProps extends ButtonProps {
    onUpload?: (files: FileList | null) => void;
    accept?: string;
    multiple?: boolean;
}

const UploadButton = React.forwardRef<HTMLButtonElement, UploadButtonProps>(
    ({ className, onUpload, accept, multiple, children, icon = "Upload", onClick, ...props }, ref) => {
        const inputRef = React.useRef<HTMLInputElement>(null);

        const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
            inputRef.current?.click();
            onClick?.(e);
        };

        const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            onUpload?.(e.target.files);
        };

        return (
            <>
                <input
                    type="file"
                    className="hidden"
                    ref={inputRef}
                    onChange={handleChange}
                    accept={accept}
                    multiple={multiple}
                />
                <Button
                    ref={ref}
                    className={className}
                    onClick={handleClick}
                    icon={icon}
                    {...props}
                >
                    {children}
                </Button>
            </>
        )
    }
)
UploadButton.displayName = "UploadButton"

export { UploadButton }
