import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { logError } from './lib/telemetry';

// Phase 9 (M-TELEMETRY): uncaught errors are logged locally (nothing
// leaves this computer) so Settings → Diagnostics can show them.
window.addEventListener('error', (event) => {
  logError(event.message ? `Error: ${event.message}` : 'Unknown error');
});
window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason instanceof Error ? event.reason.message : String(event.reason ?? 'Unknown error');
  logError(`Unhandled promise rejection: ${reason}`);
});

const root = document.getElementById('root');
if (!root) throw new Error('Root element #root not found');
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
