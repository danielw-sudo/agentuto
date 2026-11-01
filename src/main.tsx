import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './app/App';
import { ErrorBoundary } from './app/ErrorBoundary';
import { loadLocalModules } from './simulations/loadLocal';
import './styles/globals.css';

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
