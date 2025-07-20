import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Service worker management: only register in production
if ('serviceWorker' in navigator) {
  if (import.meta.env.PROD) {
    // Register service worker in production
    window.addEventListener('load', function() {
      navigator.serviceWorker.register('/service-worker.js');
    });
  } else {
    // Unregister any existing service workers in development to avoid SSL issues
    window.addEventListener('load', function() {
      navigator.serviceWorker.getRegistrations().then(function(registrations) {
        for(let registration of registrations) {
          registration.unregister();
        }
      });
    });
  }
} 