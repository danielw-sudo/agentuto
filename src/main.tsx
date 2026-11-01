import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './app/App';
import { ErrorBoundary } from './app/ErrorBoundary';
import { loadLocalModules } from './simulations/loadLocal';
import { applyTheme, browserThemeStorage, loadTheme } from './ui/theme';
import './styles/globals.css';

// The saved colour choice goes on before the first paint, so a learner who chose light never sees a dark flash.
applyTheme(document.documentElement, loadTheme(browserThemeStorage()));

// The learner's private modules (git-ignored `local/`) are read before the first render so every page sees
// them; with no `local/` folder this resolves at once.
void loadLocalModules().finally(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>
  );
});

// Register Offline Service Worker (PWA)
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {
      // Offline registration failure non-blocking
    });
  });
}
