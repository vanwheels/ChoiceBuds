/**
 * main.tsx - React Application Entry Point
 * Bootstraps the React application and mounts it to the DOM
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

/**
 * Mount the React application to the root element
 * Uses React 18+ createRoot API for concurrent features
 */
const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Failed to find the root element. Ensure index.html contains <div id="root"></div>');
}

const root = ReactDOM.createRoot(rootElement);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
