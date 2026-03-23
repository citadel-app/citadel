/**
 * Excalidraw-specific settings panel.
 * Registered via registerSettingsPanel in ExcalidrawModule.
 * Controls collaboration and canvas defaults.
 */
import { useState, useEffect } from 'react';
import { useCoreServices } from '@citadel-app/ui';

interface ExcalidrawSettings {
    collabEnabled: boolean;
    syncInterval: number;
    autoSync: boolean;
    defaultBackground: string;
}

const DEFAULT_SETTINGS: ExcalidrawSettings = {
    collabEnabled: true,
    syncInterval: 100,
    autoSync: true,
    defaultBackground: '#ffffff',
};

export const ExcalidrawSettingsPanel = () => {
    const { settings, updateSetting: coreUpdateSetting } = useCoreServices();
    const [localSettings, setLocalSettings] = useState<ExcalidrawSettings>(DEFAULT_SETTINGS);

    // Load from app settings on mount
    useEffect(() => {
        const stored = (settings as any)?.excalidraw;
        if (stored) {
            setLocalSettings({ ...DEFAULT_SETTINGS, ...stored });
        }
    }, [settings]);

    const updateSetting = (key: keyof ExcalidrawSettings, value: any) => {
        const updated = { ...localSettings, [key]: value };
        setLocalSettings(updated);
        // Persist via CoreServices
        coreUpdateSetting?.('excalidraw', updated);
        console.log('[ExcalidrawSettings] Updated:', key, value);
    };

    return (
        <div className="space-y-6 p-4 max-w-lg">
            <div>
                <h3 className="text-sm font-semibold mb-1">Collaboration</h3>
                <p className="text-xs text-muted-foreground mb-3">
                    P2P collaboration settings for real-time whiteboard sync.
                </p>

                <label className="flex items-center justify-between py-2">
                    <span className="text-sm">Enable Collaboration</span>
                    <input
                        type="checkbox"
                        checked={localSettings.collabEnabled}
                        onChange={(e) => updateSetting('collabEnabled', e.target.checked)}
                        className="rounded"
                    />
                </label>

                <label className="flex items-center justify-between py-2">
                    <span className="text-sm">Auto-Sync on Change</span>
                    <input
                        type="checkbox"
                        checked={localSettings.autoSync}
                        onChange={(e) => updateSetting('autoSync', e.target.checked)}
                        className="rounded"
                    />
                </label>

                <label className="flex flex-col gap-1 py-2">
                    <span className="text-sm">Sync Interval (ms)</span>
                    <input
                        type="number"
                        min={50}
                        max={2000}
                        step={50}
                        value={localSettings.syncInterval}
                        onChange={(e) => updateSetting('syncInterval', parseInt(e.target.value) || 100)}
                        className="w-32 px-2 py-1 text-sm border border-border rounded bg-background"
                    />
                </label>
            </div>

            <div className="border-t border-border pt-4">
                <h3 className="text-sm font-semibold mb-1">Canvas Defaults</h3>
                <p className="text-xs text-muted-foreground mb-3">
                    Default settings for new whiteboard canvases.
                </p>

                <label className="flex items-center gap-2 py-2">
                    <span className="text-sm">Background Color</span>
                    <input
                        type="color"
                        value={localSettings.defaultBackground}
                        onChange={(e) => updateSetting('defaultBackground', e.target.value)}
                        className="w-8 h-8 rounded border border-border cursor-pointer"
                    />
                    <span className="text-xs text-muted-foreground font-mono">{localSettings.defaultBackground}</span>
                </label>
            </div>
        </div>
    );
};
