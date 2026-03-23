import {
    BaseBoxShapeUtil,
    Geometry2d,
    HTMLContainer,
    RecordProps,
    Rectangle2d,
    T,
    TLBaseShape,
    DefaultColorStyle,
    DefaultSizeStyle,
    DefaultFontStyle,
    DefaultDashStyle,
    DefaultFillStyle,
    useIsEditing,
    TLDefaultColorStyle,
    TLDefaultSizeStyle,
    TLDefaultFontStyle,
    TLDefaultDashStyle,
    TLDefaultFillStyle,
    StyleProp,
    useIsDarkMode,
} from 'tldraw'
import { Icon } from '../../index';

// Define custom style for alignment
export const ArchitectureShapeAlignStyle = StyleProp.defineEnum('architecture:align', {
    defaultValue: 'bottom',
    values: ['top', 'bottom', 'left', 'right'],
})

// Define custom style for border
export const ArchitectureShapeBorderStyle = StyleProp.defineEnum('architecture:border', {
    defaultValue: 'solid',
    values: ['solid', 'none'],
})

export type IArchitectureShape = TLBaseShape<
    'architecture-component',
    {
        w: number
        h: number
        text: string
        icon: string
        color: TLDefaultColorStyle
        size: TLDefaultSizeStyle
        font: TLDefaultFontStyle
        dash: TLDefaultDashStyle
        fill: TLDefaultFillStyle
        align: 'top' | 'bottom' | 'left' | 'right'
        border: 'solid' | 'none'
    }
>

export class ArchitectureShapeUtil extends BaseBoxShapeUtil<any> {
    static override type = 'architecture-component' as const
    static override props: RecordProps<IArchitectureShape> = {
        w: T.number,
        h: T.number,
        text: T.string,
        icon: T.string,
        color: DefaultColorStyle,
        size: DefaultSizeStyle,
        font: DefaultFontStyle,
        dash: DefaultDashStyle,
        fill: DefaultFillStyle,
        align: ArchitectureShapeAlignStyle,
        border: ArchitectureShapeBorderStyle,
    }

    override canEdit = () => true

    override getDefaultProps(): IArchitectureShape['props'] {
        return {
            w: 100,
            h: 100,
            text: 'Component',
            icon: 'Box',
            color: 'blue',
            size: 'm',
            font: 'draw',
            dash: 'draw',
            fill: 'none',
            align: 'bottom',
            border: 'solid',
        }
    }

    override getGeometry(shape: IArchitectureShape): Geometry2d {
        return new Rectangle2d({
            width: shape.props.w,
            height: shape.props.h,
            isFilled: true, // Transparent but clickable
        })
    }

    override component(shape: IArchitectureShape) {
        // eslint-disable-next-line
        const isEditing = useIsEditing(shape.id)
        const isDarkMode = useIsDarkMode()
        const { color, size, font, icon, align, border, dash, fill } = shape.props

        // Map Tldraw size
        const scale = size === 's' ? 0.8 : size === 'l' ? 1.2 : size === 'xl' ? 1.5 : 1.0
        const fontSize = 12 * scale

        // Robust Color Mapping
        const colors: Record<string, string> = {
            black: isDarkMode ? '#ffffff' : '#1e1e1e', // Adaptive black
            grey: '#71717a',
            'light-violet': '#a78bfa',
            violet: '#7c3aed',
            blue: '#3b82f6',
            'light-blue': '#60a5fa',
            yellow: '#eab308',
            orange: '#f97316',
            green: '#22c55e',
            'light-green': '#4ade80',
            red: '#ef4444',
            'light-red': '#f87171',
            white: isDarkMode ? '#1e1e1e' : '#ffffff', // Adaptive white
        }

        const themeColor = colors[color] || colors.blue

        // Explicit Font Mapping (fallback to system fonts if vars missing)
        const fontMap = {
            draw: '"Kalam", "Caveat", "Comic Sans MS", cursive, sans-serif',
            sans: '"Inter", "Segoe UI", "Helvetica Neue", sans-serif',
            serif: '"Source Serif Pro", "Georgia", "Times New Roman", serif',
            mono: '"Roboto Mono", "Courier New", monospace',
        }
        const fontFamily = fontMap[font] || fontMap.draw

        // Dash Mapping
        const dashMap: Record<string, string> = {
            draw: 'solid', // CSS cannot do 'draw' style easily, fallback to solid
            solid: 'solid',
            dashed: 'dashed',
            dotted: 'dotted',
        }
        const borderStyle = dashMap[dash] || 'solid'

        // Fill Mapping (CSS background)
        // none = transparent
        // semi = 20% opacity
        // solid = 100% opacity? No, usually solid color.
        // pattern = 50% opacity?
        // But we want to preserve content visibility?
        // Actually, Tldraw 'fill' usually means the background of the shape.
        // Let's use opacity on the background color.
        // BUT `themeColor` is the text/border color.
        // Tldraw fills are usually `themeColor` with opacity?

        let backgroundColor = 'transparent';
        if (fill === 'semi') {
            backgroundColor = `${themeColor}33`; // 20% hex roughly
        } else if (fill === 'solid') {
            // If solid, we might want a solid background. 
            // typically 'solid' fill in tldraw uses the color as background.
            // But if color is 'black', background is black? Text needs to invert?
            // For simplicity, let's map 'solid' to a high opacity or just allow it.
            backgroundColor = themeColor;
        } else if (fill === 'pattern') {
            backgroundColor = `${themeColor}80`; // 50%
        }

        const effectiveBorder = border === 'none' ? 'none' : `2px ${borderStyle} ${themeColor}`;

        // Styles: Transparent fill, colored border/icon/text
        const containerStyle: React.CSSProperties = {
            width: '100%',
            height: '100%',
            backgroundColor: backgroundColor,
            border: effectiveBorder,
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: fill === 'solid' ? (isDarkMode ? '#000' : '#fff') : themeColor, // Invert text if solid fill
        }

        // Text Position Logic
        let textStyle: React.CSSProperties = {
            position: 'absolute',
            whiteSpace: 'pre',
            textAlign: 'center',
            fontSize: `${fontSize}px`,
            fontFamily: fontFamily,
            color: themeColor,
            pointerEvents: 'none',
            userSelect: 'none',
            textShadow: '0 1px 2px rgba(255,255,255,0.8)',
            width: 'max-content',
            maxWidth: '200px',
            zIndex: 10,
        };

        if (isDarkMode) {
            textStyle.textShadow = '0 1px 2px rgba(0,0,0,0.8)';
        }

        if (isEditing) {
            textStyle = { ...textStyle, pointerEvents: 'all', userSelect: 'text', background: 'var(--color-background)', padding: '2px 4px', borderRadius: '4px', border: `1px solid ${themeColor}` };
        }

        switch (align) {
            case 'top':
                textStyle = { ...textStyle, bottom: '100%', marginBottom: '8px', left: '50%', transform: 'translateX(-50%)' };
                break;
            case 'left':
                textStyle = { ...textStyle, right: '100%', marginRight: '8px', top: '50%', transform: 'translateY(-50%)' };
                break;
            case 'right':
                textStyle = { ...textStyle, left: '100%', marginLeft: '8px', top: '50%', transform: 'translateY(-50%)' };
                break;
            case 'bottom':
            default:
                textStyle = { ...textStyle, top: '100%', marginTop: '8px', left: '50%', transform: 'translateX(-50%)' };
                break;
        }

        return (
            <HTMLContainer style={{ pointerEvents: 'all', overflow: 'visible' }}>
                {/* Main Icon Box */}
                <div style={containerStyle}>
                    <div style={{ transform: `scale(${scale})` }}>
                        <Icon name={icon || 'Box'} size={48} />
                    </div>
                </div>

                {/* External Text Label */}
                <div style={textStyle}>
                    {isEditing ? (
                        <textarea
                            style={{
                                width: '100%',
                                minWidth: '100px',
                                background: 'transparent',
                                border: 'none',
                                color: 'inherit',
                                fontSize: 'inherit',
                                fontFamily: 'inherit',
                                textAlign: 'center',
                                resize: 'none',
                                outline: 'none',
                                overflow: 'hidden',
                            }}
                            autoFocus
                            value={shape.props.text}
                            onPointerDown={e => e.stopPropagation()}
                            onChange={e => {
                                this.editor.updateShape({
                                    id: shape.id,
                                    type: 'architecture-component',
                                    props: { text: e.target.value }
                                } as any)
                            }}
                        />
                    ) : (
                        shape.props.text
                    )}
                </div>
            </HTMLContainer>
        )
    }

    override indicator(shape: IArchitectureShape) {
        return <rect width={shape.props.w} height={shape.props.h} rx={8} ry={8} />
    }
}
