import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Copy, ExternalLink, Lock, LockOpen, MessageCircle, RefreshCw, UserPlus, Link2 } from 'lucide-react';
import { Button } from '../ui';
import { useAuth } from '../../hooks/useAuth';
import { rsvpApi, rsvpUrlFor, type RsvpAnswer } from '../../services/rsvpApi';
import { Link } from '../../routerComponents';
import type { DietaryRequirement, EventPlan, GuestItem } from '../../types/event';
import '../../rsvp.css';

interface Props {
  plan: EventPlan;
  onAddGuest?: (guest: Omit<GuestItem, 'id'>) => void;
  onUpdateGuest?: (id: string, updates: Partial<GuestItem>) => void;
  onToast?: (message: string) => void;
  /** Reports the live link (or null) so the QR code and exported website can use it. */
  onLinkChange?: (url: string | null) => void;
}

const DIET_MAP: Record<RsvpAnswer['diet'], DietaryRequirement> = { veg: 'pure_veg', jain: 'jain', nonveg: 'none' };
const DIET_LABEL: Record<RsvpAnswer['diet'], string> = { veg: 'Pure veg', jain: 'Jain', nonveg: 'Non-veg' };

function guestFields(r: RsvpAnswer): Omit<GuestItem, 'id'> {
  const extra = [r.guests > 0 ? `Bringing ${r.guests} more` : '', r.note ? `Note: ${r.note}` : ''].filter(Boolean).join(' · ');
  return {
    name: r.name,
    email: r.email,
    rsvpStatus: r.attending ? 'attending' : 'declined',
    dietary: DIET_MAP[r.diet],
    plusOne: r.guests > 0,
    notes: extra || undefined,
    rsvpResponseId: r.id,
  };
}

function needsSync(r: RsvpAnswer, guests: GuestItem[]): boolean {
  const g = guests.find((x) => x.rsvpResponseId === r.id);
  if (!g) return true;
  const f = guestFields(r);
  return g.rsvpStatus !== f.rsvpStatus || g.plusOne !== f.plusOne || g.dietary !== f.dietary;
}

export const LiveRsvpPanel: React.FC<Props> = ({ plan, onAddGuest, onUpdateGuest, onToast, onLinkChange }) => {
  const { status } = useAuth();
  const [token, setToken] = useState<string | null>(null);
  const [closed, setClosed] = useState(false);
  const [answers, setAnswers] = useState<RsvpAnswer[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const url = token ? rsvpUrlFor(token) : null;

  useEffect(() => {
    onLinkChange?.(url);
  }, [url, onLinkChange]);

  const refresh = useCallback(
    async (t: string) => {
      const res = await rsvpApi.responses(t);
      if (res.ok) setAnswers(res.responses);
    },
    []
  );

  // Find an existing link for this event (creating nothing until the host asks for it).
  useEffect(() => {
    if (status !== 'authenticated') return;
    let alive = true;
    void rsvpApi.lookup(plan.id).then((res) => {
      if (!alive || !res.ok || !res.token) return;
      setToken(res.token);
      setClosed(res.closed);
      void refresh(res.token);
    });
    return () => {
      alive = false;
    };
  }, [plan.id, status, refresh]);

  // New answers show up without reloading.
  useEffect(() => {
    if (!token) return;
    const id = window.setInterval(() => void refresh(token), 30_000);
    return () => window.clearInterval(id);
  }, [token, refresh]);

  const stats = useMemo(() => {
    const yes = answers.filter((a) => a.attending);
    return {
      yes: yes.length,
      no: answers.length - yes.length,
      headcount: yes.reduce((n, a) => n + 1 + a.guests, 0),
    };
  }, [answers]);

  const pending = useMemo(() => answers.filter((a) => needsSync(a, plan.guests ?? [])), [answers, plan.guests]);

  if (status !== 'authenticated') {
    return (
      <p className="rsvp-note">
        <Link to="/signup">Create a free account</Link> or <Link to="/login">sign in</Link> to get a live RSVP link. Guests answer on their phone and
        the replies land in your guest list. In demo mode nothing is saved to a server.
      </p>
    );
  }

  const create = async () => {
    setBusy(true);
    setError(null);
    const res = await rsvpApi.createLink({
      eventId: plan.id,
      title: plan.title,
      date: plan.eventDate,
      venue: [plan.venueName, plan.city].filter(Boolean).join(', '),
    });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    setToken(res.token);
    setClosed(res.closed);
    void refresh(res.token);
  };

  const toggleClosed = async () => {
    if (!token) return;
    const res = await rsvpApi.setClosed(token, !closed);
    if (res.ok) {
      setClosed(res.closed);
      onToast?.(res.closed ? 'RSVPs closed. Guests can no longer reply.' : 'RSVPs are open again.');
    } else setError(res.error);
  };

  const importAll = () => {
    let added = 0;
    let updated = 0;
    for (const a of pending) {
      const existing = (plan.guests ?? []).find((g) => g.rsvpResponseId === a.id);
      if (existing && onUpdateGuest) {
        onUpdateGuest(existing.id, guestFields(a));
        updated += 1;
      } else if (!existing && onAddGuest) {
        onAddGuest(guestFields(a));
        added += 1;
      }
    }
    onToast?.(`Guest list updated: ${added} added, ${updated} changed.`);
  };

  const copy = () => {
    if (!url) return;
    void navigator.clipboard?.writeText(url).then(() => onToast?.('RSVP link copied.'));
  };
  const whatsapp = url
    ? `https://wa.me/?text=${encodeURIComponent(`You're invited to ${plan.title}! Please let us know if you can join: ${url}`)}`
    : '#';

  return (
    <div className="rsvp-panel">
      {error && (
        <div role="alert" className="rsvp-error">
          {error}
        </div>
      )}

      {!token ? (
        <Button variant="primary" onClick={create} isLoading={busy} leftIcon={<Link2 size={15} />}>
          Create live RSVP link
        </Button>
      ) : (
        <>
          <div className="rsvp-linkrow">
            <input readOnly aria-label="Live RSVP link" className="form-control" value={url ?? ''} onFocus={(e) => e.currentTarget.select()} />
            <Button variant="primary" onClick={copy} leftIcon={<Copy size={14} />}>
              Copy
            </Button>
          </div>
          <div className="rsvp-actions">
            <a className="btn btn-secondary btn-sm" href={whatsapp} target="_blank" rel="noreferrer">
              <MessageCircle size={14} /> Share on WhatsApp
            </a>
            <a className="btn btn-secondary btn-sm" href={url ?? '#'} target="_blank" rel="noreferrer">
              <ExternalLink size={14} /> Open guest page
            </a>
            <button type="button" className="btn btn-secondary btn-sm" onClick={toggleClosed}>
              {closed ? <LockOpen size={14} /> : <Lock size={14} />} {closed ? 'Reopen RSVPs' : 'Close RSVPs'}
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => token && void refresh(token)} aria-label="Refresh replies">
              <RefreshCw size={14} /> Refresh
            </button>
          </div>

          <div className="rsvp-stats" aria-label="RSVP summary">
            <div>
              <strong>{stats.yes}</strong>
              <span>Coming</span>
            </div>
            <div>
              <strong>{stats.headcount}</strong>
              <span>Total headcount</span>
            </div>
            <div>
              <strong>{stats.no}</strong>
              <span>Can't make it</span>
            </div>
          </div>

          {answers.length === 0 ? (
            <p className="rsvp-note">No replies yet. Share the link and answers will appear here.</p>
          ) : (
            <>
              <ul className="rsvp-list">
                {answers.slice(-8).reverse().map((a) => (
                  <li key={a.id}>
                    <span className={`rsvp-dot ${a.attending ? 'is-yes' : 'is-no'}`} aria-hidden="true" />
                    <span className="rsvp-list__name">{a.name}</span>
                    <span className="rsvp-list__meta">
                      {a.attending ? `Coming${a.guests ? ` +${a.guests}` : ''} · ${DIET_LABEL[a.diet]}` : "Can't make it"}
                    </span>
                  </li>
                ))}
              </ul>
              <Button variant="secondary" onClick={importAll} disabled={pending.length === 0} leftIcon={<UserPlus size={15} />}>
                {pending.length ? `Add ${pending.length} ${pending.length === 1 ? 'reply' : 'replies'} to guest list` : 'Guest list is up to date'}
              </Button>
            </>
          )}
        </>
      )}
    </div>
  );
};