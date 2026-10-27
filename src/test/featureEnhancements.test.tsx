import { describe, it, expect } from 'vitest';
import { generateQRSvg, generateQRDataUrl, generateQrCodeSvg, generateQrCodeDataUrl } from '../utils/qrCode';
import { convertFromInr, formatWithCurrency, CURRENCY_CONFIGS, CurrencyCode } from '../utils/formatters';

describe('Feature Enhancements: QR Code Generator', () => {
  it('generates valid SVG for arbitrary wedding website URLs', () => {
    const url = 'https://celebration.example.com/events/aarav-ananya';
    const svg = generateQrCodeSvg(url, { size: 240, quietZone: 2 });
    
    expect(svg).toContain('<svg');
    expect(svg).toContain('viewBox="0 0 240 240"');
    expect(svg).toContain('fill="#1f2937"');
    expect(svg).toContain('</svg>');
  });

  it('generates data URL suitable for img src attributes', () => {
    const url = 'https://eventwise.app/rsvp/12345';
    const dataUrl = generateQrCodeDataUrl(url, { size: 180 });
    
    expect(dataUrl.startsWith('data:image/svg+xml;utf8,')).toBe(true);
    expect(decodeURIComponent(dataUrl)).toContain('<svg');
  });

  it('handles custom dark and light color options', () => {
    const svg = generateQRSvg('https://test.com', {
      fgColor: '#b45309',
      bgColor: '#fef3c7',
    });
    expect(svg).toContain('fill="#b45309"');
    expect(svg).toContain('fill="#fef3c7"');
  });
});

describe('Feature Enhancements: Multi-Currency & NRI Conversion', () => {
  const sampleInrAmount = 1000000; // 10 Lakh INR

  it('supports all defined currency codes', () => {
    const currencies: CurrencyCode[] = ['INR', 'USD', 'AED', 'GBP'];
    currencies.forEach((code) => {
      expect(CURRENCY_CONFIGS[code]).toBeDefined();
      expect(CURRENCY_CONFIGS[code].symbol).toBeTruthy();
      expect(CURRENCY_CONFIGS[code].ratePerInr).toBeGreaterThan(0);
    });
  });

  it('correctly converts INR to USD, AED, and GBP', () => {
    const inr = convertFromInr(sampleInrAmount, 'INR');
    const usd = convertFromInr(sampleInrAmount, 'USD');
    const aed = convertFromInr(sampleInrAmount, 'AED');
    const gbp = convertFromInr(sampleInrAmount, 'GBP');

    expect(inr).toBe(sampleInrAmount);
    expect(usd).toBeCloseTo(sampleInrAmount / 86, 0);
    expect(aed).toBeCloseTo(sampleInrAmount / 23.4, 0);
    expect(gbp).toBeCloseTo(sampleInrAmount / 112, 0);
  });

  it('formats converted amounts with appropriate symbols and decimal digits', () => {
    expect(formatWithCurrency(sampleInrAmount, 'INR')).toContain('₹');
    expect(formatWithCurrency(sampleInrAmount, 'USD')).toContain('$');
    expect(formatWithCurrency(sampleInrAmount, 'AED')).toContain('AED');
    expect(formatWithCurrency(sampleInrAmount, 'GBP')).toContain('£');
  });
});
