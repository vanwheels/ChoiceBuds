/**
 * main.tsx - Web Application Entry Point
 * Same shape as src/renderer/main.tsx (the Electron entry), but mounts
 * AppWeb instead of App - see AppWeb.tsx's header for why they're separate
 * components rather than one shared shell.
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import AppWeb from '../src/renderer/AppWeb';
import '../src/renderer/index.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Failed to find the root element. Ensure index.html contains <div id="root"></div>');
}

const root = ReactDOM.createRoot(rootElement);

root.render(
  <React.StrictMode>
    <AppWeb />
  </React.StrictMode>
);
