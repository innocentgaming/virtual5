import { useState, useEffect } from 'react';

export function safeNextPath(candidate: string | null | undefined, defaultPath = '/app'): string {
  if (!candidate || typeof candidate !== 'string') return defaultPath;
  const trimmed = candidate.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//') || trimmed.startsWith('/\\')) return defaultPath;
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) return defaultPath;
  if (trimmed === '/login' || trimmed.startsWith('/login?') || trimmed === '/signup' || trimmed.startsWith('/signup?')) {
    return defaultPath;
  }
  return trimmed;
}

export function navigate(to: string, options: { replace?: boolean } = {}): void {
  if (options.replace) {
    window.history.replaceState({}, '', to);
  } else {
    window.history.pushState({}, '', to);
  }
  window.dispatchEvent(new Event('popstate'));
}

export function useLocation() {
  const [loc, setLoc] = useState(() => ({
    pathname: typeof window !== 'undefined' ? window.location.pathname : '/',
    search: typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams(),
  }));

  useEffect(() => {
    const onPop = () => {
      setLoc({
        pathname: window.location.pathname,
        search: new URLSearchParams(window.location.search),
      });
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  return loc;
}

export function usePageTitle(title: string): void {
  useEffect(() => {
    const prev = document.title;
    document.title = title;
    return () => {
      document.title = prev;
    };
  }, [title]);
}
