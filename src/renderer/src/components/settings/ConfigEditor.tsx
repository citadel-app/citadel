import { useState, useEffect } from 'react';
import { useConfig } from '../../context/ConfigContext';
import { EntryTypeList } from './EntryTypeList';
import { ModuleList } from './ModuleList';
import Editor from '@monaco-editor/react';
import { Code2, Settings2, Save } from 'lucide-react'; // Renamed Icons to LucideIcons to avoid conflict if I used * as import style, but I'm using named imports here.

export const ConfigEditor = () => {
    const { config, updateConfig, isLoading } = useConfig();
    const [mode, setMode] = useState<'ui' | 'json'>('ui');
    const [json, setJson] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isDirty, setIsDirty] = useState(false);

    useEffect(() => {
        setJson(JSON.stringify(config, null, 2));
        setIsDirty(false); // Reset dirty on config load
    }, [config]);

    const handleSaveJson = async () => {
        try {
            const parsed = JSON.parse(json);
            await updateConfig(parsed);
            setIsDirty(false);
            setError(null);
        } catch (e: any) {
            setError(e.message);
        }
    };

    const handleJsonChange = (value: string | undefined) => {
        if (value === undefined) return;
        setJson(value);
        setIsDirty(true);
        // Basic validation
        try {
            JSON.parse(value);
            setError(null);
        } catch (e: any) {
            setError(e.message);
        }
    };

    const handleUiUpdate = async (updates: any) => {
        // Direct update for UI mode (auto-save behavior or debounced could be nice, but explicit is fine for now)
        // Actually, for consistency with EntryTypeList which calls onChange immediately:
        await updateConfig(updates);
    };

    if (isLoading) {
        return <div className="text-center p-4 text-muted-foreground">Loading configuration...</div>;
    }

    return (
        <div className="flex flex-col gap-4 h-full">
            <div className="flex items-center justify-between pb-2 border-b border-border">
                <div className='flex pb-2 shrink-0 gap-4'>
                    <div className="flex justify-between items-center">
                        <h2 className="text-lg font-semibold">Configuration</h2>
                    </div>
                    <div className="flex bg-muted/50 p-1 rounded-lg">
                        <button
                            onClick={() => setMode('ui')}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-2 ${mode === 'ui'
                                ? 'bg-background shadow-sm text-foreground'
                                : 'text-muted-foreground hover:text-foreground'
                                }`}
                        >
                            <Settings2 size={14} /> Visual Editor
                        </button>
                        <button
                            onClick={() => {
                                setJson(JSON.stringify(config, null, 2)); // Refresh JSON from current config before switching
                                setMode('json');
                            }}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-2 ${mode === 'json'
                                ? 'bg-background shadow-sm text-foreground'
                                : 'text-muted-foreground hover:text-foreground'
                                }`}
                        >
                            <Code2 size={14} /> JSON Editor
                        </button>
                    </div>
                </div>


                {mode === 'json' && (
                    <div className="flex items-center gap-3">
                        {error ? (
                            <span className="text-destructive text-xs">{error}</span>
                        ) : (
                            <span className="text-muted-foreground text-xs">Valid JSON</span>
                        )}
                        <button
                            onClick={handleSaveJson}
                            disabled={!isDirty || !!error}
                            className="flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-medium rounded hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <Save size={14} /> Save Changes
                        </button>
                    </div>
                )}
            </div>

            {mode === 'ui' ? (
                <div className="flex-1 pr-2 space-y-6">
                    {/* General Settings Section */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-medium text-foreground">Git</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-muted-foreground">Default Remote</label>
                                <input
                                    type="text"
                                    value={config.settings?.defaultRemote || ''}
                                    onChange={(e) => handleUiUpdate({
                                        settings: { ...config.settings, defaultRemote: e.target.value }
                                    })}
                                    placeholder="origin"
                                    className="w-full h-8 px-2 text-sm bg-background border border-input rounded focus:border-primary outline-none"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-muted-foreground">Default Branch</label>
                                <input
                                    type="text"
                                    value={config.settings?.defaultBranch || ''}
                                    onChange={(e) => handleUiUpdate({
                                        settings: { ...config.settings, defaultBranch: e.target.value }
                                    })}
                                    placeholder="main"
                                    className="w-full h-8 px-2 text-sm bg-background border border-input rounded focus:border-primary outline-none"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="pt-4">
                        <EntryTypeList
                            entries={config.entries}
                            onChange={(updatedEntries) => handleUiUpdate({ entries: updatedEntries })}
                        />
                    </div>

                    <div className="pt-4 border-t border-border mt-4">
                        <ModuleList
                            modules={config.modules || {}}
                            onChange={(updatedModules) => handleUiUpdate({ modules: updatedModules })}
                        />
                    </div>
                </div>
            ) : (
                <div className="flex-1 border border-border rounded-lg overflow-hidden min-h-[500px]">
                    <Editor
                        height="500px"
                        defaultLanguage="json"
                        theme="vs-dark"
                        value={json}
                        onChange={handleJsonChange}
                        options={{
                            minimap: { enabled: false },
                            fontSize: 12,
                            wordWrap: 'on',
                            scrollBeyondLastLine: false,
                        }}
                    />
                </div>
            )}
        </div>
    );
};
