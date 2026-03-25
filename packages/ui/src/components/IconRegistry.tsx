import React, { useMemo } from 'react';
import * as LucideIcons from 'lucide-react';
import * as SimpleIcons from 'simple-icons';
import { cn } from '../lib/utils'; // fix import if necessary, assuming absolute or relative is fine

export type IconProvider = 'lucide' | 'simple' | 'url';

interface IconProps extends React.SVGProps<SVGSVGElement> {
    name: string;
    provider?: IconProvider;
    size?: string | number;
    className?: string;
    strokeWidth?: string | number;
}

// Pre-compute lowercase map for case-insensitive lookup of Simple Icons
const SIMPLE_ICON_MAP = Object.keys(SimpleIcons).reduce((acc, key) => {
    const namePart = key.startsWith('si') ? key.slice(2).toLowerCase() : key.toLowerCase();
    acc[namePart] = key;
    acc[key.toLowerCase()] = key;
    return acc;
}, {} as Record<string, string>);

// Pre-compute lowercase map for case-insensitive lookup of Lucide Icons
const LUCIDE_ICON_MAP = Object.keys(LucideIcons).reduce((acc, key) => {
    acc[key.toLowerCase()] = key;
    return acc;
}, {} as Record<string, string>);

export const Icon = ({ name, provider = 'lucide', className, size = 16, ...props }: IconProps) => {
    // Check if name is a URL/Path implicitly if provider is not strict
    const isUrl = name.includes('/') || name.includes('.');

    if (isUrl || provider === 'url') {
        return (
            <img
                src={name}
                alt="icon"
                style={{ width: size, height: size }}
                className={cn("inline-block object-contain", className)}
                draggable={false}
            />
        );
    }

    const IconComponent = useMemo(() => {
        if (provider === 'lucide') {
            const lucideIcon = (LucideIcons as any)[name];
            if (!lucideIcon) {
                // console.warn(`Lucide icon "${name}" not found.`);
                return LucideIcons.HelpCircle; // Fallback
            }
            return lucideIcon;
        } else if (provider === 'simple') {
            // Simple Icons - Case Insensitive Lookup
            const normalizedName = name.toLowerCase().replace(/\s+/g, '');
            const actualKey = SIMPLE_ICON_MAP[normalizedName] ||
                SIMPLE_ICON_MAP[`si${normalizedName}`];

            const simpleIcon = actualKey ? (SimpleIcons as any)[actualKey] : null;

            if (!simpleIcon) {
                // console.warn(`Simple icon "${name}" not found.`);
                return null;
            }

            return (props: any) => (
                <svg
                    role="img"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    xmlns="http://www.w3.org/2000/svg"
                    width={props.size}
                    height={props.size}
                    className={props.className}
                    style={props.style}
                    {...props}
                >
                    <path d={simpleIcon.path} />
                </svg>
            );
        }
        return null;
    }, [name, provider]);

    if (!IconComponent) return null;

    return <IconComponent size={size} className={cn("inline-block", className)} {...props} />;
};

// Custom SVG paths for icons missing from standard libraries
// Format: <name>: { path: string, viewBox?: string }
export const CUSTOM_ICONS: Record<string, { path: string; viewBox?: string }> = {
    "yahoo": {
        path: "M18.86 1.56L14.27 11.87H19.4L24 1.56H18.86M0 6.71L5.15 18.27L3.3 22.44H7.83L14.69 6.71H10.19L7.39 13.44L4.62 6.71H0M15.62 12.87C13.95 12.87 12.71 14.12 12.71 15.58C12.71 17 13.91 18.19 15.5 18.19C17.18 18.19 18.43 16.96 18.43 15.5C18.43 14.03 17.23 12.87 15.62 12.87Z"
    },
    "authy": {
        path: "M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm3.42 5.338c.274 0 .551.105.769.315l2.862 2.862c2.054 2.039 2.084 5.35.105 7.449a.21.21 0 0 1-.045.06l-.03.03-.03.03c-.015.015-.045.03-.06.045-2.098 1.978-5.41 1.948-7.463-.105l-2.863-2.863a1.05 1.05 0 0 1 0-1.499 1.05 1.05 0 0 1 1.5 0l2.861 2.863a3.23 3.23 0 0 0 4.542.03 3.244 3.244 0 0 0-.03-4.541l-2.863-2.862a1.05 1.05 0 0 1 0-1.5c.203-.209.472-.314.746-.314zM8.758 6.397a5.33 5.33 0 0 1 3.715 1.564l2.863 2.862c.42.42.42 1.08 0 1.5-.42.419-1.08.419-1.5 0L10.975 9.46a3.249 3.249 0 0 0-4.558-.015 3.243 3.243 0 0 0 .03 4.54l2.863 2.863c.42.42.42 1.08 0 1.499a1.05 1.05 0 0 1-1.499 0L4.95 15.484c-2.054-2.053-2.084-5.365-.105-7.463.015-.03.03-.045.045-.06l.03-.03.03-.03c.015-.015.045-.03.06-.045a5.355 5.355 0 0 1 3.748-1.46z"
    },
    "sendgrid": {
        path: "M.8 24h13.6c.88 0 1.6-.72 1.6-1.6v-4.8c0-.88-.72-1.6-1.6-1.6H9.6c-.88 0-1.6-.72-1.6-1.6V9.6C8 8.72 7.28 8 6.4 8H1.6C.72 8 0 8.72 0 9.6v13.6c0 .44.36.8.8.8zM23.2 0H9.6C8.72 0 8 .72 8 1.6v4.8C8 7.28 8.72 8 9.6 8h4.8c.88 0 1.6.72 1.6 1.6v4.8c0 .88.72 1.6 1.6 1.6h4.8c.88 0 1.6-.72 1.6-1.6V.8c0-.44-.36-.8-.8-.8Z"
    },
    "twilio": {
        path: "M12 0C5.381-.008.008 5.352 0 11.971V12c0 6.64 5.359 12 12 12 6.64 0 12-5.36 12-12 0-6.641-5.36-12-12-12zm0 20.801c-4.846.015-8.786-3.904-8.801-8.75V12c-.014-4.846 3.904-8.786 8.75-8.801H12c4.847-.014 8.786 3.904 8.801 8.75V12c.015 4.847-3.904 8.786-8.75 8.801H12zm5.44-11.76c0 1.359-1.12 2.479-2.481 2.479-1.366-.007-2.472-1.113-2.479-2.479 0-1.361 1.12-2.481 2.479-2.481 1.361 0 2.481 1.12 2.481 2.481zm0 5.919c0 1.36-1.12 2.48-2.481 2.48-1.367-.008-2.473-1.114-2.479-2.48 0-1.359 1.12-2.479 2.479-2.479 1.361-.001 2.481 1.12 2.481 2.479zm-5.919 0c0 1.36-1.12 2.48-2.479 2.48-1.368-.007-2.475-1.113-2.481-2.48 0-1.359 1.12-2.479 2.481-2.479 1.358-.001 2.479 1.12 2.479 2.479zm0-5.919c0 1.359-1.12 2.479-2.479 2.479-1.367-.007-2.475-1.112-2.481-2.479 0-1.361 1.12-2.481 2.481-2.481 1.358 0 2.479 1.12 2.479 2.481z"
    },
    "microsoft": {
        path: "M0 0v11.408h11.408V0zm12.594 0v11.408H24V0zM0 12.594V24h11.408V12.594zm12.594 0V24H24V12.594z"
    },
    "amazon": {
        path: "M.045 18.02c.072-.116.187-.124.348-.022 3.636 2.11 7.594 3.166 11.87 3.166 2.852 0 5.668-.533 8.447-1.595l.315-.14c.138-.06.234-.1.293-.13.226-.088.39-.046.525.13.12.174.09.336-.12.48-.256.19-.6.41-1.006.654-1.244.743-2.64 1.316-4.185 1.726a17.617 17.617 0 01-10.951-.577 17.88 17.88 0 01-5.43-3.35c-.1-.074-.151-.15-.151-.22 0-.047.021-.09.051-.13zm6.565-6.218c0-1.005.247-1.863.743-2.577.495-.71 1.17-1.25 2.04-1.615.796-.335 1.756-.575 2.912-.72.39-.046 1.033-.103 1.92-.174v-.37c0-.93-.105-1.558-.3-1.875-.302-.43-.78-.65-1.44-.65h-.182c-.48.046-.896.196-1.246.46-.35.27-.575.63-.675 1.096-.06.3-.206.465-.435.51l-2.52-.315c-.248-.06-.372-.18-.372-.39 0-.046.007-.09.022-.15.247-1.29.855-2.25 1.82-2.88.976-.616 2.1-.975 3.39-1.05h.54c1.65 0 2.957.434 3.888 1.29.135.15.27.3.405.48.12.165.224.314.283.45.075.134.15.33.195.57.06.254.105.42.135.51.03.104.062.3.076.615.01.313.02.493.02.553v5.28c0 .376.06.72.165 1.036.105.313.21.54.315.674l.51.674c.09.136.136.256.136.36 0 .12-.06.226-.18.314-1.2 1.05-1.86 1.62-1.963 1.71-.165.135-.375.15-.63.045a6.062 6.062 0 01-.526-.496l-.31-.347a9.391 9.391 0 01-.317-.42l-.3-.435c-.81.886-1.603 1.44-2.4 1.665-.494.15-1.093.227-1.83.227-1.11 0-2.04-.343-2.76-1.034-.72-.69-1.08-1.665-1.08-2.94l-.05-.076zm3.753-.438c0 .566.14 1.02.425 1.364.285.34.675.512 1.155.512.045 0 .106-.007.195-.02.09-.016.134-.023.166-.023.614-.16 1.08-.553 1.424-1.178.165-.28.285-.58.36-.91.09-.32.12-.59.135-.8.015-.195.015-.54.015-1.005v-.54c-.84 0-1.484.06-1.92.18-1.275.36-1.92 1.17-1.92 2.43l-.035-.02zm9.162 7.027c.03-.06.075-.11.132-.17.362-.243.714-.41 1.05-.5a8.094 8.094 0 011.612-.24c.14-.012.28 0 .41.03.65.06 1.05.168 1.172.33.063.09.099.228.099.39v.15c0 .51-.149 1.11-.424 1.8-.278.69-.664 1.248-1.156 1.68-.073.06-.14.09-.197.09-.03 0-.06 0-.09-.012-.09-.044-.107-.12-.064-.24.54-1.26.806-2.143.806-2.64 0-.15-.03-.27-.087-.344-.145-.166-.55-.257-1.224-.257-.243 0-.533.016-.87.046-.363.045-.7.09-1 .135-.09 0-.148-.014-.18-.044-.03-.03-.036-.047-.02-.077 0-.017.006-.03.02-.063v-.06z"
    },
    "oracle": {
        path: "M16.412 4.412h-8.82a7.588 7.588 0 0 0-.008 15.176h8.828a7.588 7.588 0 0 0 0-15.176zm-.193 12.502H7.786a4.915 4.915 0 0 1 0-9.828h8.433a4.914 4.914 0 1 1 0 9.828z",
    }
};


interface DynamicIconProps extends React.SVGProps<SVGSVGElement> {
    name: string;
    size?: string | number;
    color?: string;
    variant?: 'default' | 'filled' | 'outline';
}

/**
 * Universal Icon Renderer
 * Cascaded Lookup: Custom -> Lucide -> SimpleIcons
 */
export const DynamicIcon = React.memo(({
    name,
    size = 16,
    color = 'currentColor',
    variant = 'default',
    className,
    style,
    ...props
}: DynamicIconProps) => {
    const normalizedName = name.toLowerCase().replace(/\s+/g, '');

    // 1. Try CUSTOM_ICONS
    const customIcon = CUSTOM_ICONS[normalizedName];
    if (customIcon) {
        return (
            <svg
                viewBox={customIcon.viewBox || "0 0 24 24"}
                fill={color}
                width={size}
                height={size}
                className={cn("inline-block", className)}
                style={style}
                {...(props as any)}
            >
                <path d={customIcon.path} />
            </svg>
        );
    }

    // 2. Try Lucide Icons
    // Lucide names are PascalCase (e.g., Code2, Brain)
    // We try to find a case-insensitive match from the pre-computed map
    const lucideKey = LUCIDE_ICON_MAP[normalizedName] ||
        LUCIDE_ICON_MAP[name.toLowerCase().replace(/[^a-z0-9]/g, '')];

    if (lucideKey) {
        const LucideIcon = (LucideIcons as any)[lucideKey];
        return <LucideIcon size={size} color={color} className={cn("inline-block", className)} style={style} {...props} />;
    }

    // 3. Try Simple Icons (Brand Icons)
    const actualKey = SIMPLE_ICON_MAP[normalizedName] ||
        SIMPLE_ICON_MAP[`si${normalizedName}`];

    if (actualKey) {
        const simpleIcon = (SimpleIcons as any)[actualKey];
        return (
            <svg
                role="img"
                viewBox="0 0 24 24"
                fill={color}
                xmlns="http://www.w3.org/2000/svg"
                width={size}
                height={size}
                className={cn("inline-block", className)}
                style={style}
                {...(props as any)}
            >
                <path d={simpleIcon.path} />
            </svg>
        );
    }
    return null;
});

export const LUCIDE_ICON_NAMES = Object.keys(LucideIcons).filter(key => key !== 'default');

export function hasSimpleIcon(name: string): boolean {
    const normalizedName = name.toLowerCase().replace(/\s+/g, '');
    return !!(SIMPLE_ICON_MAP[normalizedName] || SIMPLE_ICON_MAP[`si${normalizedName}`] || CUSTOM_ICONS[normalizedName]);
}
