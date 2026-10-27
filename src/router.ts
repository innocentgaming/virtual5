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

export interface PageMetaOptions {
  noindex?: boolean;
}

export function usePageTitle(title: string, options: PageMetaOptions = {}): void {
  useEffect(() => {
    const prev = document.title;
    document.title = title;

    let meta = document.querySelector('meta[name="robots"]') as HTMLMetaElement | null;
    let created = false;

    if (options.noindex) {
      if (!meta) {
        meta = document.createElement('meta');
        meta.name = 'robots';
        document.head.appendChild(meta);
        created = true;
      }
      meta.content = 'noindex, nofollow';
    }

    return () => {
      document.title = prev;
      if (options.noindex && meta) {
        if (created) {
          meta.remove();
        } else {
          meta.removeAttribute('content');
        }
      }
    };
  }, [title, options.noindex]);
}

