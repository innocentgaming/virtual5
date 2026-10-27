import React from 'react';
import { Link } from '../routerComponents';
import { Logo } from '../components/ui';
import '../site.css';

export const Brand: React.FC = () => (
  <Link to="/" className="s-brand" aria-label="EventWise AI Home">
    <Logo size="md" />
    <span className="s-brand__tag">India</span>
  </Link>
);

export const SiteNav: React.FC = () => (
  <header className="s-header">
    <div className="s-wrap s-header__inner">
      <Brand />
      <nav className="s-nav" aria-label="Primary site navigation">
        <a href="/#celebrations" className="s-nav__link">Celebrations</a>
        <a href="/#features" className="s-nav__link">Features</a>
        <a href="/#how" className="s-nav__link">How it works</a>
        <a href="/#faq" className="s-nav__link">FAQ</a>
      </nav>
      <div className="s-header__actions">
        <Link to="/demo" className="s-btn s-btn--subtle">Demo</Link>
        <Link to="/login" className="s-btn s-btn--ghost">Sign in</Link>
        <Link to="/signup" className="s-btn s-btn--primary">Create account</Link>
      </div>
    </div>
  </header>
);

export const SiteFooter: React.FC = () => (
  <footer className="s-footer">
    <div className="s-wrap s-footer__grid">
      <div className="s-footer__info">
        <Brand />
        <p className="s-footer__desc">
          Intelligent, culturally attuned celebration planning for weddings, birthdays, and community melas across India.
        </p>
      </div>
      <div className="s-footer__cols">
        <div>
          <h4>Product</h4>
          <ul>
            <li><Link to="/demo">Explore demo</Link></li>
            <li><Link to="/login">Sign in</Link></li>
            <li><Link to="/signup">Create account</Link></li>
            <li><a href="/#celebrations">Celebration types</a></li>
          </ul>
        </div>
        <div>
          <h4>Standards</h4>
          <ul>
            <li><Link to="/privacy">Privacy Policy</Link></li>
            <li><Link to="/terms">Terms of Service</Link></li>
            <li><span>No third-party trackers</span></li>
            <li><span>Vedic timing precision</span></li>
          </ul>
        </div>
      </div>
    </div>
    <div className="s-wrap s-footer__bottom">
      <p>© {new Date().getFullYear()} EventWise AI. Built for India First.</p>
    </div>
  </footer>
);

export const SiteLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="site">
    <SiteNav />
    <main id="main">{children}</main>
    <SiteFooter />
  </div>
);
