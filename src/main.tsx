import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import gsap from 'gsap';
import { App } from './App';
import './styles/tokens.css';
import './styles/base.css';

// Test hook: headless software-GL runs at a few fps; lets e2e scripts disable lag smoothing.
if (import.meta.env.DEV) (window as unknown as { __gsap: typeof gsap }).__gsap = gsap;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
