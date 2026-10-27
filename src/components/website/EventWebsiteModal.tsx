import React, { useState, useEffect } from 'react';
import {
  Modal,
  Button,
} from '../ui';
import type { EventPlan, GuestItem } from '../../types/event';
import {
  Smartphone,
  Monitor,
  Copy,
  Download,
  Calendar,
  MapPin,
  Clock,
  Share2,
  CheckCircle2,
  Palette,
  Eye,
  Send,
  QrCode,
} from 'lucide-react';
import { generateQRSvg, generateQRDataUrl } from '../../utils/qrCode';

interface EventWebsiteModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: EventPlan | null;
  onAddGuest?: (guest: Omit<GuestItem, 'id'>) => void;
  onToast?: (message: string) => void;
}

type Tab = 'preview' | 'customize' | 'share';
type DeviceMode = 'desktop' | 'mobile';

interface WebsiteTheme {
  id: string;
  name: string;
  bgGradient: string;
  cardBg: string;
  accent: string;
  text: string;
  textMuted: string;
  border: string;
}

const THEMES: WebsiteTheme[] = [
  {
    id: 'royal-marigold',
    name: 'Royal Marigold & Antique Gold',
    bgGradient: 'linear-gradient(135deg, #2b1810 0%, #1a0f0a 100%)',
    cardBg: 'rgba(45, 26, 18, 0.85)',
    accent: '#f59e0b',
    text: '#fef3c7',
    textMuted: '#d97706',
    border: 'rgba(245, 158, 11, 0.25)',
  },
  {
    id: 'bollywood-neon',
    name: 'Bollywood Neon & Midnight',
    bgGradient: 'linear-gradient(135deg, #090d16 0%, #1e1b4b 100%)',
    cardBg: 'rgba(30, 27, 75, 0.85)',
    accent: '#ec4899',
    text: '#fdf2f8',
    textMuted: '#f472b6',
    border: 'rgba(236, 72, 153, 0.3)',
  },
  {
    id: 'emerald-utsav',
    name: 'Emerald Lawn & Heritage Brass',
    bgGradient: 'linear-gradient(135deg, #062018 0%, #03140f 100%)',
    cardBg: 'rgba(8, 44, 34, 0.85)',
    accent: '#10b981',
    text: '#ecfdf5',
    textMuted: '#34d399',
    border: 'rgba(16, 185, 129, 0.3)',
  },
  {
    id: 'rose-elegance',
    name: 'Rose Gold & Champagne Velvet',
    bgGradient: 'linear-gradient(135deg, #2a111a 0%, #180910 100%)',
    cardBg: 'rgba(48, 20, 30, 0.85)',
    accent: '#fb7185',
    text: '#fff1f2',
    textMuted: '#f43f5e',
    border: 'rgba(251, 113, 133, 0.3)',
  },
];

export const EventWebsiteModal: React.FC<EventWebsiteModalProps> = ({
  isOpen,
  onClose,
  plan,
  onAddGuest,
  onToast,
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('preview');
  const [deviceMode, setDeviceMode] = useState<DeviceMode>('desktop');
  const [selectedThemeId, setSelectedThemeId] = useState<string>('royal-marigold');
  const [showCountdown, setShowCountdown] = useState(true);
  const [showSchedule, setShowSchedule] = useState(true);
  const [showRsvp, setShowRsvp] = useState(true);
  const [customGreeting, setCustomGreeting] = useState('');

  // Interactive RSVP state within the preview
  const [rsvpName, setRsvpName] = useState('');
  const [rsvpEmail, setRsvpEmail] = useState('');
  const [rsvpDiet, setRsvpDiet] = useState<'veg' | 'jain' | 'nonveg'>('veg');
  const [rsvpAttending, setRsvpAttending] = useState<'attending' | 'declined'>('attending');
  const [rsvpNote, setRsvpNote] = useState('');
  const [rsvpSuccess, setRsvpSuccess] = useState(false);

  // Live countdown calculation
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number }>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    if (!plan?.eventDate) return;
    const target = new Date(plan.eventDate).getTime();

    const updateTimer = () => {
      const now = Date.now();
      const diff = Math.max(0, target - now);
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeLeft({ days, hours, minutes, seconds });
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [plan?.eventDate]);

  if (!plan) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Event Website Builder"
        subtitle="Create an interactive celebration website"
        size="md"
      >
        <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
            Please select or create an event celebration first to generate an event website.
          </p>
          <Button variant="primary" onClick={onClose}>
            Close
          </Button>
        </div>
      </Modal>
    );
  }

  const currentTheme = THEMES.find((t) => t.id === selectedThemeId) || THEMES[0];

  const handleRsvpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rsvpName.trim()) return;

    if (onAddGuest) {
      onAddGuest({
        name: rsvpName.trim(),
        email: rsvpEmail.trim() || undefined,
        rsvpStatus: rsvpAttending === 'attending' ? 'attending' : 'declined',
        dietary: rsvpDiet === 'veg' ? 'pure_veg' : rsvpDiet === 'jain' ? 'jain' : 'none',
        plusOne: false,
        notes: rsvpNote ? `RSVP note: ${rsvpNote}` : undefined,
      });
    }

    setRsvpSuccess(true);
    onToast?.(`RSVP confirmed for ${rsvpName.trim()}! Added to guest manager.`);
    setTimeout(() => {
      setRsvpSuccess(false);
      setRsvpName('');
      setRsvpEmail('');
      setRsvpNote('');
    }, 4000);
  };

  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/app?event=${plan?.eventType || 'wedding'}&website=1`
    : 'https://eventwise.ai/app?website=1';

  const handleCopyShareLink = () => {
    if (typeof window === 'undefined') return;
    navigator.clipboard.writeText(shareUrl);
    onToast?.('✓ Shareable celebration website link copied to clipboard!');
  };

  const handleDownloadQrSvg = () => {
    if (!plan) return;
    const svgMarkup = generateQRSvg(shareUrl, { size: 400, fgColor: currentTheme.accent, bgColor: '#ffffff' });
    const blob = new Blob([svgMarkup], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${plan.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-invitation-qr.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    onToast?.('✓ Invitation card QR code downloaded for print!');
  };

  const handleDownloadStandaloneHtml = () => {
    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${plan.title} — Official Celebration Website</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,800;1,400&family=Plus+Jakarta+Sans:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: ${currentTheme.bgGradient};
      --card-bg: ${currentTheme.cardBg};
      --accent: ${currentTheme.accent};
      --text: ${currentTheme.text};
      --text-muted: ${currentTheme.textMuted};
      --border: ${currentTheme.border};
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: var(--bg);
      color: var(--text);
      font-family: 'Plus Jakarta Sans', -apple-system, sans-serif;
      min-height: 100vh;
      line-height: 1.6;
      padding-bottom: 4rem;
    }
    h1, h2, h3, .serif { font-family: 'Playfair Display', Georgia, serif; }
    .hero {
      text-align: center;
      padding: 5rem 1.5rem 3rem;
      max-width: 800px;
      margin: 0 auto;
    }
    .badge {
      display: inline-block;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      font-size: 0.8rem;
      font-weight: 700;
      color: var(--accent);
      border: 1px solid var(--border);
      padding: 4px 14px;
      border-radius: 999px;
      margin-bottom: 1.5rem;
    }
    h1 {
      font-size: clamp(2.2rem, 5vw, 3.5rem);
      line-height: 1.15;
      margin-bottom: 1rem;
      color: var(--accent);
    }
    .meta-pills {
      display: flex;
      justify-content: center;
      gap: 1.5rem;
      flex-wrap: wrap;
      margin: 1.5rem 0 2.5rem;
      font-size: 1rem;
    }
    .countdown-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1rem;
      max-width: 500px;
      margin: 0 auto 3rem;
    }
    .timer-card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 1rem 0.5rem;
      text-align: center;
      backdrop-filter: blur(8px);
    }
    .timer-val { font-size: 1.8rem; font-weight: 800; color: var(--accent); }
    .timer-label { font-size: 0.75rem; text-transform: uppercase; opacity: 0.8; }
    .container { max-width: 800px; margin: 0 auto; padding: 0 1.5rem; }
    .card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 2rem;
      margin-bottom: 2rem;
      backdrop-filter: blur(8px);
    }
    .card h2 { color: var(--accent); margin-bottom: 1rem; font-size: 1.7rem; }
    .timeline-item {
      display: flex;
      gap: 1.5rem;
      padding: 1rem 0;
      border-bottom: 1px solid var(--border);
    }
    .timeline-item:last-child { border-bottom: none; }
    .timeline-time { min-width: 90px; font-weight: 700; color: var(--accent); }
    .form-group { margin-bottom: 1rem; }
    .form-group label { display: block; margin-bottom: 0.4rem; font-size: 0.85rem; font-weight: 600; }
    .form-control {
      width: 100%;
      padding: 0.75rem 1rem;
      border-radius: 8px;
      border: 1px solid var(--border);
      background: rgba(0,0,0,0.3);
      color: #fff;
      font-size: 0.95rem;
    }
    .btn-submit {
      width: 100%;
      padding: 0.85rem;
      border-radius: 8px;
      background: var(--accent);
      color: #000;
      font-weight: 800;
      font-size: 1rem;
      border: none;
      cursor: pointer;
      margin-top: 1rem;
    }
  </style>
</head>
<body>
  <div class="hero">
    <div class="badge">Official Invitation</div>
    <h1>${plan.title}</h1>
    <p style="font-size: 1.1rem; opacity: 0.9; margin-bottom: 1rem;">
      ${customGreeting || 'You are warmly invited to celebrate with us.'}
    </p>
    <div class="meta-pills">
      <div>📅 ${new Date(plan.eventDate).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
      <div>📍 ${plan.venueName ? `${plan.venueName}, ` : ''}${plan.city}</div>
    </div>

    ${
      showCountdown
        ? `<div class="countdown-grid">
      <div class="timer-card"><div class="timer-val" id="d">${timeLeft.days}</div><div class="timer-label">Days</div></div>
      <div class="timer-card"><div class="timer-val" id="h">${timeLeft.hours}</div><div class="timer-label">Hours</div></div>
      <div class="timer-card"><div class="timer-val" id="m">${timeLeft.minutes}</div><div class="timer-label">Mins</div></div>
      <div class="timer-card"><div class="timer-val" id="s">${timeLeft.seconds}</div><div class="timer-label">Secs</div></div>
    </div>`
        : ''
    }
  </div>

  <div class="container">
    <div class="card">
      <h2>Celebration Details</h2>
      <p style="margin-bottom: 0.8rem;"><strong>Theme & Aesthetics:</strong> ${plan.theme || 'Festive Indian Celebration'}</p>
      ${plan.culturalTraditions ? `<p style="margin-bottom: 0.8rem;"><strong>Cultural Traditions:</strong> ${plan.culturalTraditions}</p>` : ''}
      ${plan.specialNotes ? `<p style="margin-bottom: 0.8rem;"><strong>Notes for Guests:</strong> ${plan.specialNotes}</p>` : ''}
    </div>

    ${
      showSchedule && plan.tasks.length > 0
        ? `<div class="card">
      <h2>Muhurat & Schedule</h2>
      ${plan.tasks
        .slice(0, 6)
        .map(
          (t) => `
        <div class="timeline-item">
          <div class="timeline-time">${t.dueDate || 'Milestone'}</div>
          <div>
            <div style="font-weight: 700;">${t.title}</div>
            <div style="font-size: 0.85rem; opacity: 0.8;">${t.category} • ${t.priority}</div>
          </div>
        </div>
      `
        )
        .join('')}
    </div>`
        : ''
    }

    ${
      showRsvp
        ? `<div class="card" id="rsvp">
      <h2>Guest RSVP</h2>
      <p style="margin-bottom: 1.5rem; opacity: 0.85;">Please let us know if you can join us!</p>
      <form onsubmit="event.preventDefault(); alert('Thank you! Your RSVP has been received.');">
        <div class="form-group">
          <label>Your Full Name</label>
          <input class="form-control" required placeholder="Guest name">
        </div>
        <div class="form-group">
          <label>Email or Phone</label>
          <input class="form-control" type="email" placeholder="contact@example.com">
        </div>
        <div class="form-group">
          <label>Will you be attending?</label>
          <select class="form-control">
            <option>Joyfully Accepts</option>
            <option>Regretfully Declines</option>
          </select>
        </div>
        <button type="submit" class="btn-submit">Submit RSVP</button>
      </form>
    </div>`
        : ''
    }
  </div>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `celebration-website-${plan.id}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    onToast?.('Standalone celebration website (.html) downloaded!');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="🌐 Event Website & Invitation Builder"
      subtitle={`${plan.title} — Guest Invitation & Online RSVP Portal`}
      size="xl"
      ariaLabel="Event Website Builder Modal"
    >
      {/* Tab Navigation */}
      <div
        role="tablist"
        aria-label="Website builder tools"
        style={{
          display: 'flex',
          borderBottom: '1px solid var(--border)',
          marginBottom: '1.25rem',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}
      >
        <div style={{ display: 'flex' }}>
          {(['preview', 'customize', 'share'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={activeTab === tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: 'var(--space-2) var(--space-4)',
                background: 'transparent',
                border: 'none',
                borderBottom: activeTab === tab ? '2px solid var(--accent-primary)' : '2px solid transparent',
                color: activeTab === tab ? 'var(--accent-primary)' : 'var(--text-muted)',
                fontWeight: 700,
                fontSize: 'var(--text-sm)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}
            >
              {tab === 'preview' && <Eye size={15} />}
              {tab === 'customize' && <Palette size={15} />}
              {tab === 'share' && <Share2 size={15} />}
              <span style={{ textTransform: 'capitalize' }}>
                {tab === 'preview' ? 'Live Preview' : tab === 'customize' ? 'Design & Themes' : 'Publish & Share'}
              </span>
            </button>
          ))}
        </div>

        {activeTab === 'preview' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <button
              type="button"
              className={`btn btn-sm ${deviceMode === 'desktop' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setDeviceMode('desktop')}
              title="Desktop View"
              aria-label="Desktop View"
              style={{ padding: '4px 8px' }}
            >
              <Monitor size={14} />
            </button>
            <button
              type="button"
              className={`btn btn-sm ${deviceMode === 'mobile' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setDeviceMode('mobile')}
              title="Mobile View"
              aria-label="Mobile View"
              style={{ padding: '4px 8px' }}
            >
              <Smartphone size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Tab 1: Live Preview */}
      {activeTab === 'preview' && (
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <div
            style={{
              width: deviceMode === 'mobile' ? '380px' : '100%',
              maxHeight: '620px',
              overflowY: 'auto',
              borderRadius: deviceMode === 'mobile' ? '28px' : 'var(--radius-lg)',
              border: deviceMode === 'mobile' ? '8px solid #1f2937' : '1px solid var(--border)',
              background: currentTheme.bgGradient,
              color: currentTheme.text,
              padding: deviceMode === 'mobile' ? '1.5rem 1rem 2rem' : '2.5rem 2rem 3rem',
              boxShadow: 'var(--shadow-lg)',
              transition: 'all var(--transition-normal)',
            }}
          >
            {/* Live Hero Header */}
            <header style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <div
                style={{
                  display: 'inline-block',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  padding: '3px 12px',
                  borderRadius: 'var(--radius-pill)',
                  border: `1px solid ${currentTheme.border}`,
                  color: currentTheme.accent,
                  marginBottom: '1rem',
                  background: 'rgba(0,0,0,0.2)',
                }}
              >
                Official Celebration Invitation
              </div>

              <h1
                style={{
                  fontSize: deviceMode === 'mobile' ? '1.6rem' : '2.2rem',
                  fontWeight: 800,
                  color: currentTheme.accent,
                  margin: '0 0 0.5rem',
                  lineHeight: 1.2,
                }}
              >
                {plan.title}
              </h1>

              <p style={{ fontSize: '0.9rem', color: currentTheme.text, opacity: 0.9, maxWidth: '500px', margin: '0 auto 1.25rem' }}>
                {customGreeting || 'We request the honor of your presence as we celebrate this joyous milestone together.'}
              </p>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '1rem',
                  flexWrap: 'wrap',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Calendar size={14} color={currentTheme.accent} />
                  {new Date(plan.eventDate).toLocaleDateString('en-IN', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
                <span>•</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <MapPin size={14} color={currentTheme.accent} />
                  {plan.venueName ? `${plan.venueName}, ` : ''}{plan.city}
                </span>
              </div>
            </header>

            {/* Live Countdown Timer */}
            {showCountdown && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '0.65rem',
                  maxWidth: '420px',
                  margin: '0 auto 2rem',
                }}
              >
                {[
                  { label: 'Days', val: timeLeft.days },
                  { label: 'Hours', val: timeLeft.hours },
                  { label: 'Minutes', val: timeLeft.minutes },
                  { label: 'Seconds', val: timeLeft.seconds },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: currentTheme.cardBg,
                      border: `1px solid ${currentTheme.border}`,
                      borderRadius: '10px',
                      padding: '0.65rem 0.25rem',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ fontSize: '1.35rem', fontWeight: 800, color: currentTheme.accent, lineHeight: 1 }}>
                      {item.val}
                    </div>
                    <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', opacity: 0.8, marginTop: '4px' }}>
                      {item.label}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Celebration Details Card */}
            <div
              style={{
                background: currentTheme.cardBg,
                border: `1px solid ${currentTheme.border}`,
                borderRadius: '14px',
                padding: '1.25rem',
                marginBottom: '1.5rem',
              }}
            >
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: currentTheme.accent, margin: '0 0 0.75rem' }}>
                Celebration Highlights
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem' }}>
                <div>
                  <strong>Theme:</strong> {plan.theme || 'Traditional Grandeur'}
                </div>
                {plan.culturalTraditions && (
                  <div>
                    <strong>Traditions & Muhurat:</strong> {plan.culturalTraditions}
                  </div>
                )}
                {plan.specialNotes && (
                  <div>
                    <strong>Guest Amenities:</strong> {plan.specialNotes}
                  </div>
                )}
              </div>
            </div>

            {/* Schedule Section */}
            {showSchedule && plan.tasks.length > 0 && (
              <div
                style={{
                  background: currentTheme.cardBg,
                  border: `1px solid ${currentTheme.border}`,
                  borderRadius: '14px',
                  padding: '1.25rem',
                  marginBottom: '1.5rem',
                }}
              >
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: currentTheme.accent, margin: '0 0 0.75rem' }}>
                  Program Schedule
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {plan.tasks.slice(0, 4).map((task) => (
                    <div
                      key={task.id}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '0.85rem',
                        paddingBottom: '0.6rem',
                        borderBottom: `1px solid ${currentTheme.border}`,
                      }}
                    >
                      <Clock size={15} color={currentTheme.accent} style={{ marginTop: '2px', flexShrink: 0 }} />
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>{task.title}</div>
                        <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>
                          Category: {task.category} • Priority: {task.priority}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Interactive RSVP Form inside Live Preview */}
            {showRsvp && (
              <div
                style={{
                  background: currentTheme.cardBg,
                  border: `1px solid ${currentTheme.border}`,
                  borderRadius: '14px',
                  padding: '1.5rem',
                }}
              >
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: currentTheme.accent, margin: '0 0 0.5rem' }}>
                  Confirm Your RSVP
                </h3>
                <p style={{ fontSize: '0.8rem', opacity: 0.85, margin: '0 0 1rem' }}>
                  Kindly let us know if you will be celebrating with us!
                </p>

                {rsvpSuccess ? (
                  <div
                    style={{
                      background: 'rgba(16, 185, 129, 0.2)',
                      border: '1px solid rgba(16, 185, 129, 0.5)',
                      color: '#34d399',
                      padding: '1rem',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.6rem',
                      fontSize: '0.85rem',
                    }}
                  >
                    <CheckCircle2 size={18} />
                    <span>RSVP Received! Thank you for celebrating with us.</span>
                  </div>
                ) : (
                  <form onSubmit={handleRsvpSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '3px' }}>
                        Your Full Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={rsvpName}
                        onChange={(e) => setRsvpName(e.target.value)}
                        placeholder="e.g. Vikram & Ritu Singhania"
                        style={{
                          width: '100%',
                          padding: '0.5rem 0.75rem',
                          borderRadius: '6px',
                          border: `1px solid ${currentTheme.border}`,
                          background: 'rgba(0,0,0,0.3)',
                          color: '#fff',
                          fontSize: '0.85rem',
                        }}
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '3px' }}>
                          Attendance
                        </label>
                        <select
                          value={rsvpAttending}
                          onChange={(e) => setRsvpAttending(e.target.value as 'attending' | 'declined')}
                          style={{
                            width: '100%',
                            padding: '0.5rem 0.75rem',
                            borderRadius: '6px',
                            border: `1px solid ${currentTheme.border}`,
                            background: 'rgba(0,0,0,0.3)',
                            color: '#fff',
                            fontSize: '0.85rem',
                          }}
                        >
                          <option value="attending" style={{ background: '#1f2937' }}>Joyfully Accepts</option>
                          <option value="declined" style={{ background: '#1f2937' }}>Regretfully Declines</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '3px' }}>
                          Dietary Choice
                        </label>
                        <select
                          value={rsvpDiet}
                          onChange={(e) => setRsvpDiet(e.target.value as 'veg' | 'jain' | 'nonveg')}
                          style={{
                            width: '100%',
                            padding: '0.5rem 0.75rem',
                            borderRadius: '6px',
                            border: `1px solid ${currentTheme.border}`,
                            background: 'rgba(0,0,0,0.3)',
                            color: '#fff',
                            fontSize: '0.85rem',
                          }}
                        >
                          <option value="veg" style={{ background: '#1f2937' }}>Pure Vegetarian</option>
                          <option value="jain" style={{ background: '#1f2937' }}>Jain Counter</option>
                          <option value="nonveg" style={{ background: '#1f2937' }}>Non-Vegetarian</option>
                        </select>
                      </div>
                    </div>

                    <button
                      type="submit"
                      style={{
                        marginTop: '0.5rem',
                        padding: '0.65rem 1rem',
                        borderRadius: '6px',
                        background: currentTheme.accent,
                        color: '#000',
                        fontWeight: 800,
                        fontSize: '0.85rem',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.4rem',
                      }}
                    >
                      <Send size={14} /> Submit RSVP
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Design & Themes */}
      {activeTab === 'customize' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text)' }}>
              Choose Website Visual Palette
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
              {THEMES.map((theme) => (
                <div
                  key={theme.id}
                  onClick={() => setSelectedThemeId(theme.id)}
                  style={{
                    padding: '1rem',
                    borderRadius: 'var(--radius-md)',
                    border: selectedThemeId === theme.id ? `2px solid var(--accent-primary)` : '1px solid var(--border)',
                    background: theme.bgGradient,
                    color: theme.text,
                    cursor: 'pointer',
                    boxShadow: selectedThemeId === theme.id ? 'var(--shadow-md)' : 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700 }}>{theme.name}</span>
                    {selectedThemeId === theme.id && <CheckCircle2 size={16} color="var(--accent-primary)" />}
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <div style={{ width: 18, height: 18, borderRadius: '50%', background: theme.accent }} />
                    <div style={{ width: 18, height: 18, borderRadius: '50%', background: theme.cardBg }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="custom-greeting">
              Host Welcome Message / Story Headline
            </label>
            <input
              id="custom-greeting"
              className="form-control"
              value={customGreeting}
              onChange={(e) => setCustomGreeting(e.target.value)}
              placeholder="e.g. Together with our families, we joyfully invite you..."
            />
          </div>

          <div>
            <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text)' }}>
              Website Modules & Features
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', cursor: 'pointer', fontSize: 'var(--text-xs)' }}>
                <input
                  type="checkbox"
                  checked={showCountdown}
                  onChange={(e) => setShowCountdown(e.target.checked)}
                />
                <span>Live Countdown Clock</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', cursor: 'pointer', fontSize: 'var(--text-xs)' }}>
                <input
                  type="checkbox"
                  checked={showSchedule}
                  onChange={(e) => setShowSchedule(e.target.checked)}
                />
                <span>Muhurat & Schedule Milestones</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', cursor: 'pointer', fontSize: 'var(--text-xs)' }}>
                <input
                  type="checkbox"
                  checked={showRsvp}
                  onChange={(e) => setShowRsvp(e.target.checked)}
                />
                <span>Online RSVP Form for Guests</span>
              </label>
            </div>
          </div>

          <Button
            variant="primary"
            onClick={() => setActiveTab('preview')}
            leftIcon={<Eye size={15} />}
          >
            Apply & View Preview
          </Button>
        </div>
      )}

      {/* Tab 3: Publish & Share */}
      {activeTab === 'share' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div
            className="card"
            style={{
              padding: '1.5rem',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              background: 'var(--surface-raised)',
            }}
          >
            <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 700, margin: '0 0 0.5rem', color: 'var(--text)' }}>
              1. Shareable Invitation Link
            </h3>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', margin: '0 0 1rem' }}>
              Share this celebration link with your guests via WhatsApp, Email, or SMS to collect RSVPs.
            </p>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                readOnly
                value={typeof window !== 'undefined' ? `${window.location.origin}/app?event=${plan.eventType}&website=1` : ''}
                className="form-control"
                style={{ fontSize: 'var(--text-xs)' }}
              />
              <Button
                variant="primary"
                onClick={handleCopyShareLink}
                leftIcon={<Copy size={14} />}
              >
                Copy
              </Button>
            </div>
          </div>

          <div
            className="card"
            style={{
              padding: '1.5rem',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              background: 'var(--surface-raised)',
            }}
          >
            <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 700, margin: '0 0 0.5rem', color: 'var(--text)' }}>
              2. Download Standalone HTML Website
            </h3>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', margin: '0 0 1rem' }}>
              Export a 100% self-contained website file (.html) that you can host on GitHub Pages, Netlify, or open locally in any browser.
            </p>

            <Button
              variant="secondary"
              onClick={handleDownloadStandaloneHtml}
              leftIcon={<Download size={15} />}
            >
              Download Standalone .html Website
            </Button>
          </div>

          <div
            className="card"
            style={{
              padding: '1.5rem',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              background: 'var(--surface-raised)',
            }}
          >
            <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 700, margin: '0 0 0.5rem', color: 'var(--text)' }}>
              3. Invitation Card QR Code (For Physical Cards)
            </h3>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', margin: '0 0 1rem' }}>
              Print this QR code on physical Indian wedding cards, Lagan Patrika, or invitation envelopes. Guests can scan with any smartphone camera to open this website and RSVP immediately.
            </p>

            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <div
                style={{
                  background: '#ffffff',
                  padding: '0.6rem',
                  borderRadius: '10px',
                  display: 'inline-flex',
                  border: '1px solid var(--border)',
                }}
              >
                <img
                  src={generateQRDataUrl(shareUrl, { size: 130, fgColor: currentTheme.accent, bgColor: '#ffffff' })}
                  alt="Celebration Website QR Code"
                  width={130}
                  height={130}
                  style={{ display: 'block' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', flex: 1, minWidth: '220px' }}>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                  <strong>Destination Link:</strong>
                  <div style={{ wordBreak: 'break-all', marginTop: '2px', opacity: 0.85 }}>{shareUrl}</div>
                </div>
                <div>
                  <Button
                    variant="primary"
                    onClick={handleDownloadQrSvg}
                    leftIcon={<QrCode size={15} />}
                  >
                    Download QR Code (SVG Vector)
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
};
