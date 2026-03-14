import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <App />
);

// Service worker: vite-plugin-pwa handles registration automatically in production
// via injectRegister:'auto'. We only manually unregister stale SWs in dev.
if ('serviceWorker' in navigator && !import.meta.env.PROD) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.getRegistrations().then(function(registrations) {
      for (const registration of registrations) {
        registration.unregister();
      }
    });
  });
} 