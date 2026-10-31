import '@testing-library/jest-dom/vitest';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PrivacyPage, TermsPage } from '../pages/LegalPages';
import { SiteLayout } from '../pages/SiteChrome';
import { AuthProvider } from '../context/AuthContext';

describe('Legal & Marketing Pages', () => {
  it('renders Privacy Policy page with headings and data policy', () => {
    render(
      <AuthProvider>
        <PrivacyPage />
      </AuthProvider>,
    );

    expect(screen.getByRole('heading', { level: 1, name: /Privacy Policy/i })).toBeInTheDocument();
    expect(screen.getByText(/What We Store/i)).toBeInTheDocument();
    expect(screen.getByText(/Cookies and Sessions/i)).toBeInTheDocument();
  });

  it('renders Terms of Service page with legal terms', () => {
    render(
      <AuthProvider>
        <TermsPage />
      </AuthProvider>,
    );

    expect(
      screen.getByRole('heading', { level: 1, name: /Terms of Service/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Acceptance of Terms/i)).toBeInTheDocument();
  });

  it('renders SiteNav and SiteFooter components', () => {
    render(
      <AuthProvider>
        <SiteLayout>
          <div>Main Content</div>
        </SiteLayout>
      </AuthProvider>,
    );

    expect(screen.getByText(/Main Content/i)).toBeInTheDocument();
    expect(screen.getByText(/Built for India First/i)).toBeInTheDocument();
  });
});
