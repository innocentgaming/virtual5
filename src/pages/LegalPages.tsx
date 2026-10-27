import React from 'react';
import { usePageTitle } from '../router';
import { Link } from '../routerComponents';
import { SiteLayout } from './SiteChrome';
import '../site.css';

export function PrivacyPage(): React.ReactElement {
  usePageTitle('Privacy Policy | EventWise AI');
  return (
    <SiteLayout>
      <div className="s-legal">
        <div className="s-wrap s-legal__body">
          <h1>Privacy Policy</h1>
          <p className="s-legal__updated">Last updated: October 2026</p>

          <h2>What We Store</h2>
          <p>
            When you create an account, we store your full name, email address, role, optional organization or family name, and a cryptographic salted hash of your password using <code>scrypt</code>. We never store plaintext passwords.
          </p>
          <p>
            When you save events while signed in, your event budgets, tasks, guest lists, and schedules are stored securely in your account database so that you can open them from any device.
          </p>

          <h2>Cookies and Sessions</h2>
          <p>
            We use a single essential <code>HttpOnly</code>, <code>SameSite=Lax</code> session cookie named <code>ew_session</code> to authenticate your requests. We do not use advertising trackers, analytics trackers, or third-party tracking scripts.
          </p>

          <h2>AI and Third-Party Services</h2>
          <p>
            The core deterministic planning engine runs entirely locally without transmitting your event details to any AI provider. If you choose to configure a Google Gemini API key for GenAI recommendations, that key is held in your browser memory for that session only and is never stored in our database.
          </p>

          <h2>Data Ownership and Account Deletion</h2>
          <p>
            Your event data belongs entirely to you. You can export any event plan at any time as a JSON file or iCalendar (.ics) file. If you delete your account from your Account Settings, your user record and all associated event plans are permanently erased from our database.
          </p>
        </div>
      </div>
    </SiteLayout>
  );
}

export function TermsPage(): React.ReactElement {
  usePageTitle('Terms of Service | EventWise AI');
  return (
    <SiteLayout>
      <div className="s-legal">
        <div className="s-wrap s-legal__body">
          <h1>Terms of Service</h1>
          <p className="s-legal__updated">Last updated: October 2026</p>

          <h2>Acceptance of Terms</h2>
          <p>
            By creating an account or using EventWise AI, you agree to these Terms of Service. If you do not agree, you may use the guest demo mode or discontinue using the service.
          </p>

          <h2>Usage and Responsibilities</h2>
          <p>
            EventWise AI is provided as a celebration planning and budgeting assistant. While our engine provides calculation tools (such as GST &amp; TDS estimators and Vedic muhurat timing shifts), hosts and planners remain responsible for verifying legal compliance, permits (such as loudspeaker permissions), and contractual commitments with their individual vendors.
          </p>

          <h2>Account Security</h2>
          <p>
            You are responsible for safeguarding your login credentials. We provide session revocation features (&ldquo;Sign out on all devices&rdquo;) and password change verification to help protect your account.
          </p>

          <h2>Termination</h2>
          <p>
            You may terminate your account at any time directly through the application. We reserve the right to suspend or terminate accounts that abuse the platform, attempt security violations, or bypass rate limits.
          </p>
        </div>
      </div>
    </SiteLayout>
  );
}

export function NotFoundPage(): React.ReactElement {
  usePageTitle('Page Not Found | EventWise AI', { noindex: true });
  return (
    <SiteLayout>
      <div className="s-wrap" style={{ padding: '6rem 1rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>404 — Page not found</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', marginBottom: '2rem' }}>
          The page you are looking for does not exist or has been moved.
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <Link to="/" className="s-btn s-btn--primary">Return home</Link>
          <Link to="/demo" className="s-btn s-btn--ghost">Explore Demo</Link>
        </div>
      </div>
    </SiteLayout>
  );
}
