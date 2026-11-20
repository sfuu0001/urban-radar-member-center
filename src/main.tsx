import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { ToastProvider } from './components/ui/ToastContext';
import { DevSimulationProvider } from './context/DevSimulationContext';
import './index.css';

const rootEl = document.getElementById('root');
if (rootEl) {
  createRoot(rootEl).render(
    <React.StrictMode>
      <ToastProvider>
        <DevSimulationProvider>
          <App />
        </DevSimulationProvider>
      </ToastProvider>
    </React.StrictMode>
  );
}
