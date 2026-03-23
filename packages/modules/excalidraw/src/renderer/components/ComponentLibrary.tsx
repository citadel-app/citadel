import { Icon } from '@citadel-app/ui';
import { useState, useMemo, useEffect } from 'react';
import { APP_CONSTANTS } from '@citadel-app/core';
import CLOUD_ICONS_MAP from '../config/cloud-icons.json';

// Import all SVGs as URLs
// This relies on Vite's import.meta.glob feature
const iconAssets = import.meta.glob('../assets/icons/**/*.svg', { eager: true, as: 'url' });

// Define the Component Library Data
export interface LibraryItem {
    label: string;
    icon: string;
    description: string;
    provider: string; // Added provider
    category: string; // Changed to string to support many categories
    defaultProps: {
        w: number;
        h: number;
        color: 'blue' | 'green' | 'red' | 'yellow' | 'violet' | 'orange' | 'grey' | 'light-blue' | 'light-green' | 'light-red' | 'light-violet' | 'black' | 'white';
        icon: string;
        text: string;
        align: 'bottom' | 'top' | 'left' | 'right';
        border: 'solid' | 'none';
        fill?: 'none' | 'semi' | 'solid' | 'pattern';
        dash?: 'draw' | 'solid' | 'dashed' | 'dotted';
        font?: 'draw' | 'sans' | 'serif' | 'mono';
        size?: 's' | 'm' | 'l' | 'xl';
    };
}

const STANDARD_ITEMS: LibraryItem[] = [
    // Compute
    {
        label: 'Generic Service',
        icon: 'Box',
        description: 'A generic microservice',
        category: 'Standard - Compute',
        provider: 'Standard',
        defaultProps: { w: 200, h: 100, color: 'blue', icon: 'Box', text: 'Service\nLogic', align: 'bottom', border: 'solid' }
    },
    {
        label: 'Server / Instance',
        icon: 'Server',
        description: 'Physical or virtual server',
        category: 'Standard - Compute',
        provider: 'Standard',
        defaultProps: { w: 180, h: 120, color: 'grey', icon: 'Server', text: 'Server\nCompute', align: 'bottom', border: 'solid' }
    },
    {
        label: 'Lambda / Function',
        icon: 'Zap',
        description: 'Serverless function',
        category: 'Standard - Compute',
        provider: 'Standard',
        defaultProps: { w: 120, h: 80, color: 'orange', icon: 'Zap', text: 'Fn\nHandler', align: 'bottom', border: 'solid' }
    },
    // Storage
    {
        label: 'Database',
        icon: 'Database',
        description: 'Relational or NoSQL DB',
        category: 'Standard - Storage',
        provider: 'Standard',
        defaultProps: { w: 140, h: 140, color: 'green', icon: 'Database', text: 'DB\nStorage', align: 'bottom', border: 'solid' }
    },
    {
        label: 'Object Storage (S3)',
        icon: 'HardDrive',
        description: 'Blob storage bucket',
        category: 'Standard - Storage',
        provider: 'Standard',
        defaultProps: { w: 140, h: 140, color: 'green', icon: 'HardDrive', text: 'Bucket\nObjects', align: 'bottom', border: 'solid' }
    },
    {
        label: 'Cache / Redis',
        icon: 'Layers',
        description: 'In-memory cache',
        category: 'Standard - Storage',
        provider: 'Standard',
        defaultProps: { w: 160, h: 100, color: 'red', icon: 'Layers', text: 'Cache\nFast', align: 'bottom', border: 'solid' }
    },
    // Network
    {
        label: 'Load Balancer',
        icon: 'GitMerge', // Approx icon
        description: 'Traffic distributor',
        category: 'Standard - Network',
        provider: 'Standard',
        defaultProps: { w: 100, h: 100, color: 'violet', icon: 'GitMerge', text: 'LB\nTraffic', align: 'bottom', border: 'solid' }
    },
    {
        label: 'Queue / Topic',
        icon: 'List',
        description: 'Message queue',
        category: 'Standard - Network',
        provider: 'Standard',
        defaultProps: { w: 200, h: 60, color: 'yellow', icon: 'List', text: 'Queue\nMessages', align: 'bottom', border: 'solid' }
    },
    {
        label: 'API Gateway',
        icon: 'Globe',
        description: 'Entry point',
        category: 'Standard - Network',
        provider: 'Standard',
        defaultProps: { w: 160, h: 100, color: 'violet', icon: 'Globe', text: 'API GW\nRoute', align: 'bottom', border: 'solid' }
    },
];

// Process Cloud Icons
const CLOUD_ITEMS: LibraryItem[] = (CLOUD_ICONS_MAP as any).i.map((item: any) => {
    const [label, providerIdx, categoryIdx, pathSuffix, score] = item;
    const provider = (CLOUD_ICONS_MAP as any).p[providerIdx];
    const categoryName = (CLOUD_ICONS_MAP as any).c[categoryIdx];

    // Reconstruct path: all suffixes are relative to assets/icons/
    // We strip "assets/icons/" in the compaction script, so we add it back here
    const assetKey = `../../${APP_CONSTANTS.PATHS.ICONS_BASE}/${pathSuffix}`;
    const assetUrl = iconAssets[assetKey];

    if (!assetUrl) return null;

    // Determine normalized size
    const rawSize = score || 64;
    const size = rawSize > 128 ? 80 : rawSize;

    return {
        label: label,
        icon: assetUrl as string, // URL string
        description: `${provider} ${categoryName}`,
        provider: provider,
        // Create a unique category name: "AWS - Compute", "GCP - Databases"
        category: `${provider} - ${categoryName}`,
        defaultProps: {
            w: size,
            h: size,
            color: 'black', // Default text color
            icon: assetUrl as string,
            text: label,
            align: 'bottom',
            border: 'none', // Cloud icons usually transparent/no border
            fill: 'none',
            dash: 'solid',
            font: 'sans',
            size: 'm'
        }
    };
}).filter(Boolean) as LibraryItem[];

const ALL_LIBRARY_ITEMS = [...STANDARD_ITEMS, ...CLOUD_ITEMS];

const CategoryGroup = ({ category, items, onDragStart, onAddToCanvas, isOpen, onToggle }: {
    category: string;
    items: LibraryItem[];
    onDragStart: (e: React.DragEvent, item: LibraryItem) => void;
    onAddToCanvas: (item: LibraryItem) => void;
    isOpen: boolean;
    onToggle: () => void;
}) => {
    return (
        <div className="border-b border-border/50 last:border-0 w-full">
            <button
                onClick={onToggle}
                className="w-full flex items-center justify-between p-3 text-xs font-medium text-muted-foreground hover:bg-muted/50 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <Icon name={isOpen ? "ChevronDown" : "ChevronRight"} size={14} />
                    <span className="uppercase tracking-wider text-[10px] font-semibold">
                        {category.replace('Standard - ', '').replace(' - ', ' ')}
                    </span>
                </div>
                <span className="text-[10px] opacity-50 bg-secondary px-1.5 py-0.5 rounded-full">
                    {items.length}
                </span>
            </button>

            {/* Lazy Render Content */}
            {isOpen && (
                <div className="grid grid-cols-3 gap-2 p-2 bg-background/30 animate-in slide-in-from-top-2 duration-200">
                    {items.map(item => (
                        <div
                            key={`${item.category}-${item.label}`}
                            draggable
                            onDragStart={(e) => onDragStart(e, item)}
                            onClick={() => onAddToCanvas(item)}
                            className="flex flex-col items-center justify-center aspect-square rounded border border-border/50 bg-secondary/20 hover:bg-secondary/50 cursor-pointer transition-all hover:scale-105 group relative"
                            title={`${item.label}\n${item.description}`}
                        >
                            <div className={`text-${item.defaultProps.color}-500 shrink-0 mb-1`}>
                                <Icon name={item.icon} size={20} className="object-contain w-5 h-5" />
                            </div>
                            <span className="text-[8px] text-center leading-none opacity-70 px-1 truncate w-full">
                                {item.label}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

import { convertToExcalidrawElements } from '@excalidraw/excalidraw';

// Map named colors to Excalidraw-compatible Hex values
const COLOR_MAP: Record<string, string> = {
    'blue': '#3b82f6',
    'green': '#22c55e',
    'red': '#ef4444',
    'yellow': '#eab308',
    'violet': '#8b5cf6',
    'orange': '#f97316',
    'grey': '#6b7280',
    'light-blue': '#60a5fa',
    'light-green': '#4ade80',
    'light-red': '#f87171',
    'light-violet': '#a78bfa',
    'black': '#000000',
    'white': '#ffffff',
};

export const insertLibraryItem = (excalidrawAPI: any, item: LibraryItem, targetPosition?: { x: number, y: number }) => {
    if (!excalidrawAPI) return;

    const { width, height } = excalidrawAPI.getAppState();
    const appState = excalidrawAPI.getAppState();
    const zoom = appState.zoom;
    const zoomValue = typeof zoom === 'number' ? zoom : (zoom?.value || 1);
    const scrollX = appState.scrollX || 0;
    const scrollY = appState.scrollY || 0;

    let x, y;

    if (targetPosition) {
        x = targetPosition.x;
        y = targetPosition.y;
    } else {
        // Center
        x = (width / 2 - scrollX) / zoomValue - item.defaultProps.w / 2;
        y = (height / 2 - scrollY) / zoomValue - item.defaultProps.h / 2;
    }

    // const id = crypto.randomUUID();

    // Resolve color to Hex
    const baseColorName = item.defaultProps.color;
    const hexColor = COLOR_MAP[baseColorName] || '#000000';

    const elements: any[] = [];

    if (item.provider !== 'Standard') {
        // Cloud Icon Pattern
        elements.push({
            type: "rectangle",
            x: x,
            y: y,
            width: item.defaultProps.w,
            height: item.defaultProps.h,
            backgroundColor: "#f3f4f6",
            strokeColor: "#d1d5db",
            fillStyle: "solid",
            strokeWidth: 1,
            opacity: 100,
        });

        elements.push({
            type: "text",
            x: x + item.defaultProps.w / 2, // Centered (will need adjust)
            y: y + item.defaultProps.h + 5,
            text: `☁️ ${item.label}`,
            fontSize: 14,
            fontFamily: 1,
            textAlign: "center",
            verticalAlign: "middle",
            strokeColor: "#000000",
            opacity: 100,
        });

    } else {
        // Standard Component Pattern
        elements.push({
            type: "rectangle",
            x: x,
            y: y,
            width: item.defaultProps.w,
            height: item.defaultProps.h,
            strokeColor: hexColor,
            strokeWidth: 2,
            backgroundColor: `${hexColor}22`, // ~13% opacity hex
            fillStyle: "hachure", // Changed to hachure for better visibility test
            opacity: 100,
        });

        elements.push({
            type: "text",
            x: x + item.defaultProps.w / 2,
            y: y + item.defaultProps.h / 2, // Approximate center
            text: item.defaultProps.text || item.label,
            fontSize: 16,
            fontFamily: 1,
            textAlign: "center",
            verticalAlign: "middle",
            strokeColor: hexColor,
            opacity: 100,
        });
    }

    // Convert using official utility to ensure all properties (seed, version, id) are valid
    // This is the CRITICAL fix
    const excalidrawElements = convertToExcalidrawElements(elements);

    // Log full details to debug visibility
    console.log("[ComponentLibrary] Generated Elements JSON:", JSON.stringify(excalidrawElements, null, 2));
    console.log("[ComponentLibrary] Coordinate:", x, y);

    // adjustment for text centering which verify often gets wrong on raw insert
    // We can just rely on Excalidraw's default placement or simple offset for now.
    // Ideally we would measure text but that's complex without the scene.

    excalidrawAPI.updateScene({
        elements: [...excalidrawAPI.getSceneElements(), ...excalidrawElements]
    });
};

export const ComponentLibrary = ({
    excalidrawAPI,
    editor
}: {
    excalidrawAPI?: any | null;
    editor?: any | null;
}) => {
    const [filter, setFilter] = useState('');
    const [isCollapsed, setIsCollapsed] = useState(true);
    // Initialize with first category open
    const [openCategories, setOpenCategories] = useState<Set<string>>(new Set(['Standard - Compute']));

    const handleDragStart = (e: React.DragEvent, item: LibraryItem) => {
        e.dataTransfer.setData('application/json', JSON.stringify(item));
        e.dataTransfer.effectAllowed = 'copy';
    };

    // Tldraw Logic
    const insertTldrawItem = (editor: any, item: LibraryItem) => {
        if (!editor) return;

        const { x, y } = editor.getViewportScreenCenter();
        const pagePoint = editor.screenToPage({ x, y });

        editor.createShape({
            type: 'architecture-component',
            x: pagePoint.x - (item.defaultProps.w / 2),
            y: pagePoint.y - (item.defaultProps.h / 2),
            props: {
                ...item.defaultProps
            }
        });
    };

    const addToCanvas = (item: LibraryItem) => {
        if (excalidrawAPI) {
            insertLibraryItem(excalidrawAPI, item);
        } else if (editor) {
            insertTldrawItem(editor, item);
        }
    };

    const filteredItems = useMemo(() => {
        if (!filter) return ALL_LIBRARY_ITEMS;
        const lowerFilter = filter.toLowerCase();
        return ALL_LIBRARY_ITEMS.filter(i =>
            i.label.toLowerCase().includes(lowerFilter) ||
            i.description.toLowerCase().includes(lowerFilter) ||
            i.category.toLowerCase().includes(lowerFilter)
        );
    }, [filter]);

    const sortedCategories = useMemo(() => {
        const uniqueCategories = Array.from(new Set(filteredItems.map(i => i.category)));
        return uniqueCategories.sort((a, b) => {
            if (a.startsWith('Standard')) return -1;
            if (b.startsWith('Standard')) return 1;
            return a.localeCompare(b);
        });
    }, [filteredItems]);

    // Auto-expand on search
    useEffect(() => {
        if (filter) {
            setOpenCategories(new Set(sortedCategories));
        }
    }, [filter, sortedCategories]);

    const toggleCategory = (category: string) => {
        const newSet = new Set(openCategories);
        if (newSet.has(category)) {
            newSet.delete(category);
        } else {
            newSet.add(category);
        }
        setOpenCategories(newSet);
    };

    if (!excalidrawAPI && !editor) return null;

    if (isCollapsed) {
        return (
            <div className="h-full border-l border-border bg-muted/20 w-8 flex flex-col items-center py-4 gap-4 z-10 shrink-0">
                <button
                    onClick={() => setIsCollapsed(false)}
                    className="p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground rounded-md transition-colors"
                    title="Open Library"
                >
                    <Icon name="PanelRightOpen" size={16} />
                </button>
                <div className="h-px w-4 bg-border" />
                <button
                    onClick={() => setIsCollapsed(false)}
                    className="writing-mode-vertical rotate-90 text-[10px] uppercase font-bold tracking-widest text-muted-foreground hover:text-foreground opacity-70 hover:opacity-100 transition-all mb-4"
                >
                    Library
                </button>
            </div>
        );
    }

    return (
        <div
            className={`
                relative h-full border-l border-border bg-background transition-all duration-300 ease-in-out flex flex-col w-64
            `}
        >
            {/* Header / Search */}
            <div className="p-3 border-b border-border bg-muted/20 flex flex-col gap-2 sticky top-0 z-10 shrink-0">
                <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold flex items-center gap-2 text-foreground/80">
                        <Icon name="Library" size={14} />
                        Library
                    </span>
                    <button
                        onClick={() => setIsCollapsed(true)}
                        className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"
                        title="Collapse Sidebar"
                    >
                        <Icon name="PanelRightClose" size={14} />
                    </button>
                </div>
                <div className="relative">
                    <Icon name="Search" size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search components..."
                        value={filter}
                        onChange={e => setFilter(e.target.value)}
                        className="w-full pl-7 pr-2 py-1.5 text-xs bg-secondary/50 border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50 placeholder:text-muted-foreground/50"
                    />
                </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
                {sortedCategories.map(category => (
                    <CategoryGroup
                        key={category}
                        category={category}
                        items={filteredItems.filter(i => i.category === category)}
                        onDragStart={handleDragStart}
                        onAddToCanvas={addToCanvas}
                        isOpen={openCategories.has(category)}
                        onToggle={() => toggleCategory(category)}
                    />
                ))}

                {filteredItems.length === 0 && (
                    <div className="p-8 text-center text-muted-foreground text-xs flex flex-col items-center gap-2 opacity-60">
                        <Icon name="SearchX" size={24} />
                        <span>No components found</span>
                    </div>
                )}
            </div>
        </div>
    );
};
