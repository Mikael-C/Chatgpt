import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { defineCustomElements } from '@ionic/pwa-elements/loader';

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Register the service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('./firebase-messaging-sw.js');
      console.log('Service worker registered: ', registration);
    } catch (error) {
      console.error('Error registering service worker: ', error);
    }
  });
}

// Call the element loader after the app has been rendered the first time
defineCustomElements(window);
