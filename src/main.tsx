import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import './index.css';

if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  registerSW({
    immediate: true,
    onRegisteredSW(_url, reg) {
      if (!reg) return;
      const check = () => reg.update().catch(() => {});
      window.setInterval(check, 30 * 60 * 1000);
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') check();
      });
    },
  });
}

const inviteSlug = (() => {
  try {
    const v = new URLSearchParams(window.location.search).get('invite');
    return v && v.trim() ? v.trim() : null;
  } catch {
    return null;
  }
})();

const mount = async () => {
  const root = createRoot(document.getElementById('root')!);
  if (inviteSlug) {
    const { default: GuestApp } = await import('./GuestApp.tsx');
    root.render(
      <StrictMode>
        <GuestApp slug={inviteSlug} />
      </StrictMode>
    );
  } else {
    const { default: App } = await import('./App.tsx');
    root.render(
      <StrictMode>
        <App />
      </StrictMode>
    );
  }
};
void mount();
