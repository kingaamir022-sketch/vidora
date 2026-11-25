import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

// CapCut-fix (Y5): telemetry removed — uncaught errors go to the console
// only; nothing is collected or stored.
window.addEventListener('error', (event) => {
  console.error(event.message ? `Error: ${event.message}` : 'Unknown error');
});
window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason instanceof Error ? event.reason.message : String(event.reason ?? 'Unknown error');
  console.error(`Unhandled promise rejection: ${reason}`);
});

const root = document.getElementById('root');
if (!root) throw new Error('Root element #root not found');
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
