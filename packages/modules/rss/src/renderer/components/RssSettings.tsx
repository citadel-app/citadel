import React from 'react';
import { useCoreServices } from '@citadel-app/ui';

/**
 * RSS-module-local settings shape.
 * These keys use AppSettings generic index signature — owned by this module.
 */
interface RssModuleSettings {
    rssRefreshInterval?: number;
    youtubeRefreshInterval?: number;
    feedRefreshBatchSize?: number;
    [key: string]: any;
}

export const RssSettings = () => {
    const { settings, updateSetting } = useCoreServices();
    const s = settings as RssModuleSettings;

    return (
        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
            <section className="space-y-4">
                <h2 className="text-lg font-semibold border-b border-border pb-2 flex items-center gap-2">
                    Feeds (RSS &amp; YouTube)
                </h2>
                <div className="grid gap-6 pl-4">
                    <div className="grid gap-4">
                        <div className="grid gap-2">
                            <label className="text-sm font-medium">RSS Refresh Interval</label>
                            <select
                                className="bg-muted border border-border rounded px-3 py-2 text-sm w-full max-w-xs focus:ring-1 focus:ring-primary outline-none"
                                value={s.rssRefreshInterval ?? 0}
                                onChange={(e) => updateSetting('rssRefreshInterval', parseInt(e.target.value))}
                            >
                                <option value={0}>Manual Only</option>
                                <option value={3600000}>Every Hour</option>
                                <option value={7200000}>Every 2 Hours (Default)</option>
                                <option value={21600000}>Every 6 Hours</option>
                                <option value={43200000}>Every 12 Hours</option>
                                <option value={86400000}>Every 24 Hours</option>
                            </select>
                        </div>
                        <div className="grid gap-2">
                            <label className="text-sm font-medium">YouTube Refresh Interval</label>
                            <select
                                className="bg-muted border border-border rounded px-3 py-2 text-sm w-full max-w-xs focus:ring-1 focus:ring-primary outline-none"
                                value={s.youtubeRefreshInterval ?? 0}
                                onChange={(e) => updateSetting('youtubeRefreshInterval', parseInt(e.target.value))}
                            >
                                <option value={0}>Manual Only</option>
                                <option value={3600000}>Every Hour</option>
                                <option value={7200000}>Every 2 Hours (Default)</option>
                                <option value={21600000}>Every 6 Hours</option>
                                <option value={43200000}>Every 12 Hours</option>
                                <option value={86400000}>Every 24 Hours</option>
                            </select>
                        </div>
                        <div className="grid gap-2">
                            <label className="text-sm font-medium">Update Batch Size</label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="number"
                                    min={1}
                                    max={50}
                                    className="bg-muted border border-border rounded px-3 py-2 text-sm w-24 focus:ring-1 focus:ring-primary outline-none"
                                    value={s.feedRefreshBatchSize ?? 5}
                                    onChange={(e) => updateSetting('feedRefreshBatchSize', Number(e.target.value))}
                                />
                                <span className="text-sm text-muted-foreground">feeds per render</span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Controls how many feeds are processed before the UI updates.
                            </p>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};
