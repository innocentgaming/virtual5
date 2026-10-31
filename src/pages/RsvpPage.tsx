import React, { useEffect, useState } from 'react';
import { CheckCircle2, Heart } from 'lucide-react';
import { usePageTitle } from '../router';
import { Button } from '../components/ui';
import { rsvpApi, type RsvpDiet, type RsvpInfo } from '../services/rsvpApi';
import '../rsvp.css';

/** Public guest page: /rsvp/<token>. No account needed. */
export function RsvpPage({ token }: { token: string }): React.ReactElement {
  usePageTitle('RSVP | EventWise AI', { noindex: true });
  const [info, setInfo] = useState<RsvpInfo | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [attending, setAttending] = useState<'yes' | 'no'>('yes');
  const [guests, setGuests] = useState(0);
  const [diet, setDiet] = useState<RsvpDiet>('veg');
  const [note, setNote] = useState('');
  const [website, setWebsite] = useState(''); // honeypot, must stay empty
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ attending: boolean; updated: boolean } | null>(null);

  useEffect(() => {
    let alive = true;
    void rsvpApi.info(token).then((res) => {
      if (!alive) return;
      if (res.ok) setInfo(res);
      else setLoadError(res.status === 404 ? 'This invitation link is not valid. Please check the link you were sent.' : res.error);
    });
    return () => {
      alive = false;
    };
  }, [token]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const isYes = attending === 'yes';
    const res = await rsvpApi.submit({
      token,
      name,
      email: email.trim() || undefined,
      attending: isYes,
      guests: isYes ? guests : 0,
      diet,
      note: note.trim() || undefined,
      website,
    });
    setBusy(false);
    if (res.ok) setDone({ attending: isYes, updated: res.updated === true });
    else setError(res.error);
  };

  const when = info?.date
    ? new Date(`${info.date}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  return (
    <main className="rsvp-page" id="main">
      <div className="rsvp-card">
        {loadError ? (
          <div role="alert">
            <h1>Invitation not found</h1>
            <p className="rsvp-card__meta">{loadError}</p>
          </div>
        ) : !info ? (
          <p role="status" aria-live="polite" className="rsvp-note">
            Loading your invitation…
          </p>
        ) : done ? (
          <div className="rsvp-thanks" role="status">
            <CheckCircle2 size={44} color="var(--color-success, #15803d)" aria-hidden="true" />
            <h2>{done.attending ? 'See you there!' : 'Thank you for letting us know'}</h2>
            <p className="rsvp-card__meta">
              {done.updated ? 'Your reply has been updated.' : 'Your reply has been sent to the hosts.'}
              {done.attending ? ' You can come back to this page any time to change it.' : ''}
            </p>
          </div>
        ) : (
          <>
            <p className="rsvp-note" style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <Heart size={14} aria-hidden="true" /> You are invited
            </p>
            <h1>{info.title}</h1>
            <p className="rsvp-card__meta">
              {when && <span>{when}</span>}
              {info.venue && <span>{info.venue}</span>}
              {info.hosts && <span>Hosted by {info.hosts}</span>}
            </p>

            {info.closed ? (
              <p role="status" className="rsvp-error" style={{ background: 'var(--surface)', color: 'var(--text)', borderColor: 'var(--border)' }}>
                RSVPs for this event are now closed. Please contact the hosts directly.
              </p>
            ) : (
              <form className="rsvp-form" onSubmit={submit} noValidate={false}>
                {error && (
                  <div role="alert" className="rsvp-error">
                    {error}
                  </div>
                )}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label htmlFor="rsvp-name" className="form-label">Your full name</label>
                  <input id="rsvp-name" className="form-control" required minLength={2} maxLength={80} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label htmlFor="rsvp-email" className="form-label">Email (optional)</label>
                  <input id="rsvp-email" className="form-control" type="email" maxLength={254} autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>

                <fieldset>
                  <legend>Can you join us?</legend>
                  <div className="rsvp-choice">
                    <label>
                      <input type="radio" name="attending" value="yes" checked={attending === 'yes'} onChange={() => setAttending('yes')} />
                      Joyfully accept
                    </label>
                    <label>
                      <input type="radio" name="attending" value="no" checked={attending === 'no'} onChange={() => setAttending('no')} />
                      Regretfully decline
                    </label>
                  </div>
                </fieldset>

                {attending === 'yes' && (
                  <>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label htmlFor="rsvp-guests" className="form-label">Extra people coming with you</label>
                      <select id="rsvp-guests" className="form-control" value={guests} onChange={(e) => setGuests(Number(e.target.value))}>
                        {[0, 1, 2, 3, 4, 5].map((n) => (
                          <option key={n} value={n}>
                            {n === 0 ? 'Just me' : `+${n}`}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label htmlFor="rsvp-diet" className="form-label">Food preference</label>
                      <select id="rsvp-diet" className="form-control" value={diet} onChange={(e) => setDiet(e.target.value as RsvpDiet)}>
                        <option value="veg">Pure vegetarian</option>
                        <option value="jain">Jain</option>
                        <option value="nonveg">Non-vegetarian</option>
                      </select>
                    </div>
                  </>
                )}

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label htmlFor="rsvp-note" className="form-label">A message for the hosts (optional)</label>
                  <textarea id="rsvp-note" className="form-control" rows={3} maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} />
                </div>

                <div className="rsvp-hp" aria-hidden="true">
                  <label htmlFor="rsvp-website">Leave this field empty</label>
                  <input id="rsvp-website" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
                </div>

                <Button type="submit" variant="primary" isLoading={busy}>
                  Send my reply
                </Button>
              </form>
            )}
          </>
        )}
      </div>
    </main>
  );
}

export default RsvpPage;