import React, { useState, useEffect } from 'react';
import { Icon, cn } from '@citadel-app/ui';
import { hostApi as __hostApi } from '../host-services';
import { useAppSettings } from '../context/AppSettingsContext';

export const AdvancedPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'ipcs' | 'modules' | 'settings'>('ipcs');
  const [registeredIpcs, setRegisteredIpcs] = useState<string[]>([]);
  const [activeModules, setActiveModules] = useState<any[]>([]);
  const { settings } = useAppSettings();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const ipcs = await __hostApi.module.invoke('@citadel-app/base', 'system.getRegisteredIpcs' as any);
        const modules = await __hostApi.module.invoke('@citadel-app/base', 'system.getActiveModules' as any);
        setRegisteredIpcs(ipcs || []);
        setActiveModules(modules || []);
      } catch (err) {
        console.error('[AdvancedPage] Failed to fetch system state:', err);
      }
    };
    fetchData();
  }, []);

  const renderIpcSection = () => {
    // Group IPCs by namespace (moduleId)
    const grouped = registeredIpcs.reduce((acc, ipc) => {
      const [moduleId, ...rest] = ipc.split(':');
      const method = rest.join(':');
      if (!acc[moduleId]) acc[moduleId] = [];
      acc[moduleId].push(method);
      return acc;
    }, {} as Record<string, string[]>);

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Icon name="Activity" size={20} className="text-primary" />
            Registered IPC Handlers
          </h2>
          <span className="text-xs font-mono bg-muted px-2 py-1 rounded text-muted-foreground">
            Total Handlers: {registeredIpcs.length}
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(grouped).map(([moduleId, methods]) => (
            <div key={moduleId} className="bg-card border border-border rounded-xl p-4 shadow-sm hover:border-primary/30 transition-all">
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border">
                <Icon name="Package" size={16} className="text-muted-foreground" />
                <span className="font-mono text-sm font-bold text-primary truncate">{moduleId}</span>
              </div>
              <div className="space-y-1 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                {methods.sort().map(method => (
                  <div key={method} className="flex items-center gap-2 text-[11px] font-mono text-muted-foreground hover:text-foreground">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500/50" />
                    {method}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderModulesSection = () => {
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Icon name="Layers" size={20} className="text-primary" />
          Active Module Manifests
        </h2>
        <div className="space-y-4">
          {activeModules.map(mod => (
            <div key={mod.id} className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
              <div className="bg-muted/30 px-4 py-3 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-lg">{mod.name || mod.id}</span>
                  <span className="text-xs font-mono bg-primary/10 text-primary px-2 py-0.5 rounded">v{mod.version}</span>
                </div>
                <span className="text-[10px] font-mono opacity-60">ID: {mod.id}</span>
              </div>
              <div className="p-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Capability Manifest</h4>
                  <pre className="text-[10px] bg-muted/50 p-3 rounded-lg overflow-x-auto font-mono">
                    {JSON.stringify({
                      ipcs: mod.ipcs,
                      permissions: mod.permissions,
                      sidecars: mod.sidecars
                    }, null, 2)}
                  </pre>
                </div>
                <div>
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Full Manifest (Raw)</h4>
                  <pre className="text-[10px] bg-muted/50 p-3 rounded-lg overflow-x-auto font-mono max-h-[300px]">
                    {JSON.stringify(mod, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderSettingsSection = () => {
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Icon name="Settings" size={20} className="text-primary" />
          App Settings Source of Truth
        </h2>
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs text-muted-foreground">This reflects the current runtime state of `appSettings.json`</span>
            <button 
              onClick={() => {
                const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'citadel-settings-debug.json';
                a.click();
              }}
              className="text-[10px] font-bold uppercase bg-primary/10 text-primary hover:bg-primary/20 px-3 py-1.5 rounded-lg transition-all"
            >
              Export Raw Settings
            </button>
          </div>
          <pre className="text-xs bg-muted/50 p-6 rounded-2xl overflow-x-auto font-mono border border-border">
            {JSON.stringify(settings, null, 2)}
          </pre>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full overflow-y-auto bg-background p-6 custom-scrollbar">
      <div className="max-w-[1400px] mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border pb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Icon name="ShieldAlert" size={24} className="text-primary" />
              <h1 className="text-3xl font-extrabold tracking-tight">Advanced Citadel</h1>
            </div>
            <p className="text-muted-foreground max-w-2xl">
              Internal system inspection, capability auditing, and configuration source-of-truth. Handle with care.
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 bg-muted/30 p-1 rounded-xl w-fit border border-border">
          <button
            onClick={() => setActiveTab('ipcs')}
            className={cn(
              "px-4 py-2 rounded-lg text-xs font-bold transition-all",
              activeTab === 'ipcs' ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            IPCs & RPCs
          </button>
          <button
            onClick={() => setActiveTab('modules')}
            className={cn(
              "px-4 py-2 rounded-lg text-xs font-bold transition-all",
              activeTab === 'modules' ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            Plugin Manifests
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={cn(
              "px-4 py-2 rounded-lg text-xs font-bold transition-all",
              activeTab === 'settings' ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            Raw Settings
          </button>
        </div>

        {/* Content */}
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
          {activeTab === 'ipcs' && renderIpcSection()}
          {activeTab === 'modules' && renderModulesSection()}
          {activeTab === 'settings' && renderSettingsSection()}
        </div>

        {/* Footer info */}
        <div className="pt-8 border-t border-border flex items-center gap-2 opacity-40">
           <Icon name="Info" size={14} />
           <span className="text-[10px] font-bold uppercase tracking-widest">Internal Debug Mode — Citadel Node v1.1.5</span>
        </div>
      </div>
    </div>
  );
};
