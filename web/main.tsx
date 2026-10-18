/**
 * main.tsx - Web Application Entry Point
 * Same shape as src/renderer/main.tsx (the Electron entry), but mounts
 * AppWeb instead of App - see AppWeb.tsx's header for why they're separate
 * components rather than one shared shell.
 *
 * Restores the real URL first (see public/404.html's header comment for the
 * GitHub Pages SPA-fallback trick this pairs with), then checks whether the
 * path is a public profile URL (`/u/<username>`, Public Profiles: Base
 * Route - see TODO.md) before deciding what to mount. PublicProfilePage
 * renders standalone rather than as an AppWeb tab, since any signed-out
 * visitor can land on it cold and it has no business pulling in
 * AppWeb's Teams/Box/sync hooks.
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import AppWeb from '../src/renderer/AppWeb';
import PublicProfilePage from '../src/renderer/components/PublicProfilePage';
import { matchPublicProfilePath } from '../src/renderer/utils/publicProfileRoute';
import '../src/renderer/index.css';

try {
  const redirect = sessionStorage.redirect;
  delete sessionStorage.redirect;
  if (redirect && redirect !== location.href) {
    history.replaceState(null, '', redirect);
  }
} catch {
  // sessionStorage can throw in a locked-down browser context - worst case
  // a direct /u/<username> link lands on 404.html's plain redirect to /
  // instead of the profile page, not a crash.
}

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error(
    'Failed to find the root element. Ensure index.html contains <div id="root"></div>',
  );
}

const root = ReactDOM.createRoot(rootElement);
const profileUsername = matchPublicProfilePath(location.pathname);

root.render(
  <React.StrictMode>
    {profileUsername ? <PublicProfilePage username={profileUsername} /> : <AppWeb />}
  </React.StrictMode>,
);
