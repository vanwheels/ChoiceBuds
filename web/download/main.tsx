/**
 * main.tsx - Download Page Entry Point
 * Same shape as web/main.tsx (the main web app entry), but mounts
 * DownloadPage instead of AppWeb - a separate Vite build input
 * (web/vite.config.ts), not a route inside AppWeb, so visitors only
 * download the small marketing page's own bundle, not the full app.
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import DownloadPage from '../../src/renderer/components/DownloadPage';
import '../../src/renderer/index.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error(
    'Failed to find the root element. Ensure index.html contains <div id="root"></div>',
  );
}

const root = ReactDOM.createRoot(rootElement);

root.render(
  <React.StrictMode>
    <DownloadPage />
  </React.StrictMode>,
);
