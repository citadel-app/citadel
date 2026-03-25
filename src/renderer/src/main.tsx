import './assets/main.css'
import { Buffer } from 'buffer';

// Polyfill Buffer for gray-matter
if (typeof window !== 'undefined') {
  window.Buffer = Buffer;
}

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'

import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as ReactDOMClient from 'react-dom/client';
import * as ReactJSXRuntime from 'react/jsx-runtime';
import * as CitadelUI from '@citadel-app/ui';
import * as CitadelCore from '@citadel-app/core';
import * as ReactRouterDOM from 'react-router-dom';
import * as ReactResizablePanels from 'react-resizable-panels';
import * as ReactWindow from 'react-window';

// Expose shared libraries globally for runtime plugins
if (typeof window !== 'undefined') {
  (window as any).React = React;
  (window as any).ReactDOM = { ...ReactDOM, client: ReactDOMClient };
  (window as any).ReactJSXRuntime = ReactJSXRuntime;
  (window as any).CitadelUI = CitadelUI;
  (window as any).CitadelCore = CitadelCore;
  (window as any).ReactRouterDOM = ReactRouterDOM;
  (window as any).ReactResizablePanels = ReactResizablePanels;
  (window as any).ReactWindow = ReactWindow;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
