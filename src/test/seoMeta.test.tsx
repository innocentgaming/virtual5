import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('SEO & Share Metadata Suite', () => {
  const rootDir = path.resolve(__dirname, '../..');
  const indexHtml = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');

  it('includes canonical link in index.html', () => {
    expect(indexHtml).toContain('<link rel="canonical" href="https://virtual5.vercel.app/" />');
  });

  it('includes complete OpenGraph meta tags in index.html', () => {
    expect(indexHtml).toContain('<meta property="og:type" content="website" />');
    expect(indexHtml).toContain('<meta property="og:site_name" content="EventWise AI" />');
    expect(indexHtml).toContain('<meta property="og:title" content="EventWise AI: plan weddings, birthdays and melas in India" />');
    expect(indexHtml).toContain('<meta property="og:url" content="https://virtual5.vercel.app/" />');
    expect(indexHtml).toContain('<meta property="og:image" content="https://virtual5.vercel.app/og-image.png" />');
    expect(indexHtml).toContain('<meta property="og:image:width" content="1200" />');
    expect(indexHtml).toContain('<meta property="og:image:height" content="630" />');
  });

  it('includes Twitter summary card tags in index.html', () => {
    expect(indexHtml).toContain('<meta name="twitter:card" content="summary_large_image" />');
    expect(indexHtml).toContain('<meta name="twitter:title" content="EventWise AI: plan weddings, birthdays and melas in India" />');
    expect(indexHtml).toContain('<meta name="twitter:image" content="https://virtual5.vercel.app/og-image.png" />');
  });

  it('declares mobile theme-color and apple-touch-icon in index.html', () => {
    expect(indexHtml).toContain('<meta name="theme-color" content="#0f766e" />');
    expect(indexHtml).toContain('<link rel="apple-touch-icon" href="/apple-touch-icon.png" />');
  });

  it('provides public/robots.txt with disallowed app routes and sitemap link', () => {
    const robotsPath = path.join(rootDir, 'public/robots.txt');
    expect(fs.existsSync(robotsPath)).toBe(true);
    const content = fs.readFileSync(robotsPath, 'utf8');
    expect(content).toContain('User-agent: *');
    expect(content).toContain('Disallow: /app');
    expect(content).toContain('Sitemap: https://virtual5.vercel.app/sitemap.xml');
  });

  it('provides public/sitemap.xml with valid urlset', () => {
    const sitemapPath = path.join(rootDir, 'public/sitemap.xml');
    expect(fs.existsSync(sitemapPath)).toBe(true);
    const content = fs.readFileSync(sitemapPath, 'utf8');
    expect(content).toContain('<urlset');
    expect(content).toContain('<loc>https://virtual5.vercel.app/</loc>');
  });
});
