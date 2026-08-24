import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import './i18n'

createRoot(document.getElementById("root")!).render(<App />);

// Register the service worker so the app is installable (home-screen icon on
// Android and iOS, which is also what unlocks web push on iOS 16.4+). Only in
// production: a worker in dev would serve stale modules over HMR.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Registration failing (private mode, unsupported browser, blocked
      // scope) must never affect the app — it just means no install prompt.
    });
  });
}
