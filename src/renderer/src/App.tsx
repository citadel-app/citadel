import { __hostApi } from './lib/api-vault';
import React, { useState, useEffect } from 'react';
import { SplashScreen, ErrorBoundary } from '@citadel-app/ui';
import { appModuleRegistry } from './lib/module-registry';
import { BaseModule } from '@citadel-app/base';

import { loadRuntimePlugins } from './lib/plugin-loader';
import bannerImg from './assets/branding/banner.png';

export default function App() {
  const [modulesLoaded, setModulesLoaded] = useState(false);

  useEffect(() => {
    loadRuntimePlugins().then((plugins) => {
      appModuleRegistry.loadModules([
        BaseModule, 
        ...plugins
      ]).then(() => setModulesLoaded(true));
    });
  }, []);

  if (!modulesLoaded) {
    return <SplashScreen logoSrc={bannerImg} />; // Hold entire tree until Registry boots modules
  }

  const Host = appModuleRegistry.getGlobalComponents('app-host')[0] as React.ComponentType<any>;

  if (!Host) {
     return <div className="text-white p-8">FATAL: Kernel failed to load Base Module App Host.</div>;
  }

  return (
    <ErrorBoundary>
      <Host hostApi={__hostApi} appModuleRegistry={appModuleRegistry} logoSrc={bannerImg} />
    </ErrorBoundary>
  );
}
