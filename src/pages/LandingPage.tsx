import React from 'react';
import { usePageTitle } from '../router';
import { Link } from '../routerComponents';
import { SiteLayout } from './SiteChrome';
import { LiveDemoWindow } from '../components/demo/LiveDemoWindow';

const FEATURES: { title: string; body: string }[] = [
  {
    title: 'Budgets in lakhs and crores',
    body: 'Enter amounts the way you say them. Every line shows what is estimated, what is contracted and what has actually been paid, with a contingency reserve you set yourself.',
  },
  {
    title: 'A run of show that respects the muhurat',
    body: 'Build the day from Haldi to Bidaai. Move the pheras by 20 minutes and every later item moves with it. Print a crew call sheet filtered by role.',
  },
  {
    title: 'Guests, diets and seating',
    body: 'Track RSVPs, plus-ones, and Jain or pure vegetarian needs. Arrange tables visually and send invitations through WhatsApp.',
  },
  {
    title: 'Vendors, with the questions to ask',
    body: 'A checklist for the pandit, mehendi artist, dhol group, caterer and decorator, with interview questions for each so quotes are comparable.',
  },
  {
    title: 'What-if changes with undo',
    body: 'The caterer raises the price by 20 percent, or 80 more guests are coming. See the new numbers and a few concrete trade-offs, apply one, and undo it if you change your mind.',
  },
  {
    title: 'Rules that watch for known problems',
    body: 'Loudspeaker curfews for the baraat, separate counters for Jain food, tight timelines on short notice. The engine flags them and says why.',
  },
  {
    title: 'Calendar and copilot',
    body: 'Export deadlines to Google, Apple or Outlook calendar. Ask the copilot questions about your own plan; it works without any AI key, and uses Gemini if you add one.',
  },
];

const FAQ: { q: string; a: string }[] = [
  {
    q: 'Is EventWise AI free?',
    a: 'Yes, you can create an account and plan events at no cost right now.',
  },
  {
    q: 'Can I try it without signing up?',
    a: 'Yes. The demo opens with three sample events. Anything you change in the demo stays in your browser and is not saved to an account.',
  },
  {
    q: 'Do I need an AI key to use it?',
    a: 'No. The planning engine runs on its own rules. If you want AI-written suggestions, you can add a Google Gemini key, and it is kept in memory for that session only.',
  },
  {
    q: 'Who can see my plans?',
    a: 'Only you. Plans are saved to your account and tied to your sign-in. Sharing with a co-host is not available yet.',
  },
  {
    q: 'What if I forget my password?',
    a: 'Use "Forgot password" on the sign-in page. We email you a link that works once and expires after 30 minutes.',
  },
  {
    q: 'Can I take my data with me?',
    a: 'Yes. Export any plan as JSON or a calendar file at any time, and delete your account from the account menu to remove everything.',
  },
];

export default function LandingPage(): React.ReactElement {
  usePageTitle('EventWise AI: plan weddings, birthdays and melas in India');
  return (
    <SiteLayout>
      <section className="s-hero">
        <div className="s-wrap s-hero__grid">
          <div>
            <h1>Plan the whole celebration, down to the muhurat.</h1>
            <p className="s-hero__lede">
              One place for the budget, the guest list, the vendors and the day-of schedule of an Indian wedding, birthday or community mela, with numbers in rupees and rules that understand how these events actually run.
            </p>
            <div className="s-hero__cta">
              <Link to="/signup" className="s-btn s-btn--primary">Create a free account</Link>
              <Link to="/demo" className="s-btn s-btn--ghost">Explore the demo</Link>
            </div>
            <p className="s-hero__note">No card needed. The demo needs no sign-up at all.</p>
          </div>

          <figure className="s-sheet" aria-label="Example run of show and budget from a sample wedding plan" style={{ margin: 0 }}>
            <div className="s-sheet__top" aria-hidden="true" />
            <div className="s-sheet__head">
              <div>
                <div className="s-sheet__title">Aarav &amp; Ananya, wedding day</div>
                <div className="s-sheet__sub">Jaipur, 350 guests (sample plan)</div>
              </div>
            </div>
            <ol className="s-sheet__rows">
              <li><span className="s-sheet__time">10:00 am</span><span className="s-sheet__what">Haldi<small>Family courtyard, 90 minutes</small></span></li>
              <li><span className="s-sheet__time">6:30 pm</span><span className="s-sheet__what">Baraat arrives<small>Dhol group and safa station ready</small></span></li>
              <li><span className="s-sheet__time">8:15 pm</span><span className="s-sheet__what">Varmala and milni</span></li>
              <li><span className="s-sheet__time">9:40 pm</span><span className="s-sheet__what">Pheras<small>Muhurat window, pandit ji confirmed</small></span></li>
            </ol>
            <p className="s-sheet__flag"><strong>Check:</strong> outdoor loudspeakers must stop at 10:00 pm. Move the band indoors after the baraat.</p>
            <div className="s-sheet__budget">
              <div className="s-sheet__budget-row"><span>₹35,00,000 budget</span><span>₹28.7 lakh committed</span></div>
              <div className="s-bar" role="img" aria-label="Budget: 62 percent paid, 20 percent contracted, 18 percent open"><span style={{ width: '62%' }} /><span style={{ width: '20%' }} /><span style={{ width: '18%' }} /></div>
              <div className="s-sheet__legend"><span>Paid</span><span>Contracted</span><span>Open</span></div>
            </div>
          </figure>
        </div>
      </section>

      <section id="try-it" className="s-section">
        <div className="s-wrap">
          <div className="s-section__head">
            <h2>Try it right here</h2>
            <p>This is a real sample plan running on the same budget and rules engine as the app. Pick a celebration, then throw a problem at it.</p>
          </div>
          <LiveDemoWindow />
        </div>
      </section>

      <section id="celebrations" className="s-section s-section--white">
        <div className="s-wrap">
          <div className="s-section__head">
            <h2>Built for three kinds of celebration</h2>
            <p>Each starts from a plan shaped by what that event needs, then adapts to your date, city, guest count and budget.</p>
          </div>
          <div className="s-celebrate">
            <article className="s-panel s-panel--wedding">
              <div>
                <p className="s-panel__tag">Sample plan</p>
                <h3>Destination wedding</h3>
              </div>
              <div>
                <div className="s-panel__facts"><span>Jaipur</span><span>₹35 lakh</span><span>350 guests</span></div>
                <ul style={{ marginTop: '1rem' }}>
                  <li>Haldi, Sangeet, baraat and pheras in one schedule</li>
                  <li>Pandit ji, mehendi and dhol vendors tracked</li>
                  <li>Separate Jain kitchen counters flagged automatically</li>
                </ul>
              </div>
            </article>
            <article className="s-panel s-panel--birthday">
              <div>
                <p className="s-panel__tag">Sample plan</p>
                <h3>Milestone birthday</h3>
              </div>
              <div className="s-panel__facts"><span>Mumbai</span><span>₹3.5 lakh</span><span>80 guests</span></div>
              <p>A rooftop Bollywood night with a tight budget and a short guest list.</p>
            </article>
            <article className="s-panel s-panel--mela">
              <div>
                <p className="s-panel__tag">Sample plan</p>
                <h3>Community mela</h3>
              </div>
              <div className="s-panel__facts"><span>Bengaluru</span><span>₹6.5 lakh</span><span>600 guests</span></div>
              <p>Diwali and Dandiya for a housing society, with volunteers, stalls and mahaprasad.</p>
            </article>
          </div>
        </div>
      </section>

      <section id="features" className="s-section">
        <div className="s-wrap">
          <div className="s-section__head">
            <h2>What it keeps track of, so you do not have to</h2>
          </div>
          <div className="s-rows">
            {FEATURES.map((f) => (
              <div className="s-row" key={f.title}>
                <h3>{f.title}</h3>
                <p>{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="how" className="s-section s-section--white">
        <div className="s-wrap">
          <div className="s-section__head">
            <h2>From first idea to final schedule</h2>
          </div>
          <ol className="s-steps">
            <li>
              <h3>Describe the event</h3>
              <p>Pick wedding, birthday or mela, then add the city, date, guest count, budget and any dietary needs.</p>
            </li>
            <li>
              <h3>Edit the plan you get back</h3>
              <p>You start with a budget split, a timeline of tasks, a vendor checklist and a draft schedule. Change anything.</p>
            </li>
            <li>
              <h3>Change something and see what moves</h3>
              <p>Add guests, shift the date or accept a higher quote. Budget, tasks and warnings update together.</p>
            </li>
          </ol>
        </div>
      </section>

      <section className="s-section">
        <div className="s-wrap s-trust">
          <div className="s-section__head" style={{ marginBottom: 0 }}>
            <h2>Your plans stay yours</h2>
            <p>Event plans hold guest names and family details. We treat them that way.</p>
          </div>
          <ul>
            <li><strong>Passwords are never stored</strong><span>Only a salted hash is kept, so nobody at EventWise AI can read your password.</span></li>
            <li><strong>Sessions you control</strong><span>Sign out on every device at once, and changing your password signs out the rest.</span></li>
            <li><strong>Export or delete at any time</strong><span>Download your plans, or delete the account and everything saved with it.</span></li>
          </ul>
        </div>
      </section>

      <section id="faq" className="s-section s-section--white">
        <div className="s-wrap">
          <div className="s-section__head">
            <h2>Questions people ask first</h2>
          </div>
          <div className="s-faq">
            {FAQ.map((item) => (
              <details key={item.q}>
                <summary>{item.q}</summary>
                <p>{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="s-cta">
        <div className="s-wrap s-cta__row">
          <h2>Set up your first event and see the full plan.</h2>
          <div className="s-cta__actions">
            <Link to="/signup" className="s-btn s-btn--primary">Create a free account</Link>
            <Link to="/demo" className="s-btn s-btn--ghost">Explore the demo</Link>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}

export { LandingPage };

