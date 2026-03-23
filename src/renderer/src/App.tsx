import { __hostApi } from './lib/api-vault';
import React, { useState, useEffect } from 'react';
import { SplashScreen, ErrorBoundary } from '@citadel-app/ui';
import { appModuleRegistry } from './lib/module-registry';
import { BaseModule } from '@citadel-app/base';

import { ExcalidrawModule } from '@citadel-app/excalidraw';
import { PdfModule } from '@citadel-app/pdf';
// @ts-ignore
import { CodeModule } from '@citadel-app/code';
import { loadRuntimePlugins } from './lib/plugin-loader';

export default function App() {
  const [modulesLoaded, setModulesLoaded] = useState(false);

  useEffect(() => {
    loadRuntimePlugins().then((plugins) => {
      appModuleRegistry.loadModules([
        BaseModule, 
        ExcalidrawModule, 
        CodeModule, 
        PdfModule, 
        ...plugins
      ]).then(() => setModulesLoaded(true));
    });
  }, []);

  if (!modulesLoaded) {
    return <SplashScreen />; // Hold entire tree until Registry boots modules
  }

  const Host = appModuleRegistry.getGlobalComponents('app-host')[0] as React.ComponentType<any>;

  if (!Host) {
     return <div className="text-white p-8">FATAL: Kernel failed to load Base Module App Host.</div>;
  }

  return (
    <ErrorBoundary>
      <Host hostApi={__hostApi} appModuleRegistry={appModuleRegistry} />
    </ErrorBoundary>
  );
}
