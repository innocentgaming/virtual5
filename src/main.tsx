import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Synchronously initialize theme and colorMode to avoid flash of light mode
try {
  const savedMode = localStorage.getItem('eventwise_color_mode');
  const initialMode = savedMode === 'dark' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-color-mode', initialMode);
  document.documentElement.style.colorScheme = initialMode;
  if (document.body) {
    document.body.setAttribute('data-color-mode', initialMode);
  }
} catch {
  // Storage unavailable in restricted sandbox
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
