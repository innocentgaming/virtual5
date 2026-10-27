import { describe, it, expect, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';
import { usePageTitle } from '../router';

function TestComponent({ title, noindex }: { title: string; noindex?: boolean }) {
  usePageTitle(title, { noindex });
  return <div>Test page</div>;
}

describe('usePageTitle & Page Metadata Hook', () => {
  beforeEach(() => {
    document.title = 'Initial Title';
    const existing = document.querySelector('meta[name="robots"]');
    if (existing) existing.remove();
  });

  it('updates document title on mount and restores on unmount', () => {
    const { unmount } = render(<TestComponent title="Custom Title | EventWise AI" />);
    expect(document.title).toBe('Custom Title | EventWise AI');
    unmount();
    expect(document.title).toBe('Initial Title');
  });

  it('adds noindex, nofollow robots meta tag when noindex is specified', () => {
    const { unmount } = render(<TestComponent title="Sign in" noindex={true} />);
    const meta = document.querySelector('meta[name="robots"]');
    expect(meta).not.toBeNull();
    expect(meta?.getAttribute('content')).toBe('noindex, nofollow');

    unmount();
    expect(document.querySelector('meta[name="robots"]')).toBeNull();
  });
});
