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
import * as CitadelSDK from '@citadel-app/sdk';
import * as CitadelUI from '@citadel-app/ui';

// Expose shared libraries globally for runtime plugins
if (typeof window !== 'undefined') {
  (window as any).React = React;
  (window as any).ReactDOM = { ...ReactDOM, client: ReactDOMClient };
  (window as any).CitadelSDK = CitadelSDK;
  (window as any).CitadelUI = CitadelUI;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
