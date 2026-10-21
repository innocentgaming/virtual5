# EventWise AI — India Edition (v1.2.0)
### Intelligent, Personalized Event Planning Assistant for Indian Celebrations

An intelligent, full-stack, personalized event planning assistant tailored specifically for the Indian event planning ecosystem. EventWise AI organizes **Royal Weddings**, **Bollywood Milestone Birthdays**, and **Grand Community Festivals / Melas** with context-aware recommendations, dynamic Indian Rupee (`₹`) budget management, Lakhs & Crores formatting (`en-IN`), Vedic timeline Run of Show itineraries, Jain & Pure Veg dietary tracking, specialized vendor checklists (Pandit Ji, Mehendi Artists, Dhol Squads, Royal Thali Catering), and an explainable decision engine.

---

## 1. Chosen Vertical & Problem Statement

* **Primary Vertical**: Indian Event Planning Assistant (Focused exclusively on Weddings, Milestone Celebrations, and Community Festivals).
* **Problem Statement**: Organizing events in India involves multi-day celebrations, complex ritual muhurats, large guest counts, intricate dietary separations (Pure Vegetarian, Jain, Halal), loud outdoor Baraat processions subject to sound curfews, and budget scaling in Lakhs and Crores. Generic tools lack this cultural depth. EventWise AI India Edition bridges this gap by converting event inputs into a cohesive, realistic, and culturally authentic roadmap.

---

## 2. Problem Being Solved & Target Users

### Problems Solved:
1. **Multi-Scale Indian Budgeting & Lakhs/Crores Formatting**: Native Indian Rupee (`₹`) currency with `en-IN` grouping (e.g., `₹35,00,000`, `₹35 Lakhs`, `₹2.5 Cr`), interactive SVG donut chart, and signed contract vs. actuals tracking.
2. **Dedicated Pure Veg & Jain Dietary Isolation**: Automatic business rules flag the necessity of separate kitchen counters, distinct serving ladles, and clear dietary signage when Jain or Sattvic guests RSVP.
3. **Baraat Sound Curfew & Police Permission Alerts**: Built-in municipal guidelines automatically warn planners of the strict 10:00 PM cutoff for outdoor amplified sound, brass bands, and dholaks, guiding the indoor Sangeet transition.
4. **Vedic Ritual & Muhurat Pacing**: Day-of Run of Show pre-calibrated for Haldi ceremonies, Baraat processions, Milni & Varmala exchanges, Vedic Pheras around the Agni Kund, and emotional Bidaai.
5. **Specialized Vendor Pipeline**: Dedicated vetting guides and samagri checklists for Pandit Ji / Priests, Mehendi henna artists, live Dhol squads, Safa/Turban masters, and Royal Thali caterers.

### Target Users:
* **Couples & Families** organizing multi-day Indian weddings (Destination Rajasthan, Farmhouses, Banquets).
* **Individuals & Friends** planning milestone Bollywood-themed rooftop parties and celebrations.
* **Community Trusts, RWA Committees & Mandals** coordinating Diwali Melas, Dandiya/Garba Utsavs, and community Mahaprasad feasts.

---

## 3. Core Features & Key Differentiators

| Feature | Description | Key Differentiator |
| :--- | :--- | :--- |
| **Indian AI Event Planner** | Generates tailored plans for Indian weddings, birthdays, and community festivals. | Explains **why** choices were made; generates tiered alternatives in Lakhs and Crores. |
| **Interactive Budget Analytics & Actuals** | Visual SVG Donut chart, commitment %, actual invoice vs. budget tracking in Indian Rupees (`₹`). | Configurable contingency reserve (0–25%), live utilization tracker, and automated per-person cost scaling. |
| **Guest List & RSVP Manager** | Tracks attendees, plus-ones, status, table assignments, and dietary preferences. | First-class support for **Pure Vegetarian (Sattvic)** and **Jain (No Onion/Garlic/Roots)** dietary protocols. |
| **Day-of Run of Show & Itinerary** | Minute-by-minute execution schedule for Haldi, Baraat, Varmala, Vedic Pheras, and Shahi Feast. | One-click printable run sheet and calendar sync with automated reminders. |
| **RFC 5545 iCalendar (.ics) Sync** | Exports milestones, tasks, and day-of itinerary directly to Apple, Google, and Outlook calendars. | Injects automated `-P1D` (1-day advance) alarms for critical vendor deadlines. |
| **AI Copilot Drawer** | Slide-in planning assistant offering grounded advice powered by Google Gemini API & fallback engine. | Contextually aware of active event data; responds in Indian Rupee metrics and cultural terminology. |
| **Date-Aware Timeline** | Intelligent preparation schedule adjusting milestones dynamically based on days remaining. | Automatic overdue detection, short-notice triage warnings (< 14 and < 21 days), and milestone dependencies. |
| **Vendor Checklist & Interview Guide** | Pipeline tracking with specialized vetting questions for Pandit Ji, Mehendi, Dhol, and Caterers. | Zero hallucination of fake vendor names; focused on actionable checklists and contracts. |
| **Explainable Decision Engine** | Real-time rule evaluator checking budgets, venue weather contingency, Baraat sound curfew, and Jain dietary needs. | 100% deterministic offline engine that runs without requiring external APIs or network connectivity. |
| **Theme System & Dark Mode** | Dual light/dark mode and event-specific color palettes (`wedding`, `birthday`, `community`). | WCAG AA contrast compliant with persistent theme preference in localStorage. |

---

## 4. Technology Stack & Architecture

* **Frontend**: React 19, TypeScript (~6.0), Vite 8.
* **Design & Styling**: Custom responsive CSS design system with CSS custom properties, WCAG AA color tokens, responsive fluid grid, dark mode tokens (`data-color-mode="dark"`), and event-type thematic palettes (`data-theme="wedding"`, `data-theme="birthday"`, `data-theme="community"`).
* **Iconography**: Lucide React.
* **Testing Framework**: Vitest 5, React Testing Library 16, `@testing-library/jest-dom`, JSDOM.
* **Linter**: Oxlint.
* **AI Provider**: Google Gemini API (`gemini-3.8-flash` & `gemini-2.5-flash-lite`) via native HTTPS fetch with abort controller timeout protection and multi-model fallback chain.

### Architecture Directory Structure:
```
src/
├── types/
│   └── event.ts             # Domain models (EventPlan, BudgetItem, TaskItem, VendorItem, GuestItem, ScheduleItem, DecisionInsight)
├── services/
│   ├── decisionEngine.ts    # Business rule engine, budget math, timeline auditor, Jain dietary & Baraat curfew rules
│   ├── fallbackPlanner.ts   # Deterministic Indian planning engine with tiered recommendations & default schedules/guests
│   ├── aiPlanner.ts         # Multi-model Gemini API integration (3.8-flash -> 2.5-flash-lite) with schema validation & fallback
│   ├── calendarService.ts   # RFC 5545 iCalendar (.ics) generation and download service with VALARM triggers
│   ├── copilotService.ts    # Grounded AI Copilot assistant with contextual recommendations & live Gemini streaming
│   ├── storageService.ts    # LocalStorage manager with corrupted JSON recovery & schema validator
│   └── formatters.ts        # Currency (₹ en-IN), Lakhs/Crores shorthand (formatIndianShort), and percentage utilities
├── data/
│   └── sampleEvents.ts      # Curated Indian templates: Rajasthan Wedding (₹35 Lakhs), Mumbai Bollywood Bash, Bengaluru Diwali Mela
├── hooks/
│   └── useEventPlan.ts      # Central state hook with persistence, recalculation & dispatch
├── components/
│   ├── layout/              # Header with theme toggle, Copilot trigger, iCal sync, and Responsive Navigation
│   ├── dashboard/           # Metrics cards, countdown, utilization bar, urgent alerts, quick action shortcuts
│   ├── setup/               # Wizard form with Indian city datalist, INR inputs, and Indian venue/food preferences
│   ├── budget/              # Interactive SVG Donut chart, invoice contract tracking, expense table, contingency slider
│   ├── timeline/            # Date-aware schedule, status filters, overdue badges
│   ├── guests/              # Guest list, RSVP tracker, Jain & Pure Veg dietary badges, search, and add/edit modal
│   ├── schedule/            # Day-of Run of Show, Vedic milestone cards, coordinator roles, iCal & print buttons
│   ├── copilot/             # Slide-in AI Copilot drawer with suggested prompt chips and chat thread
│   ├── vendors/             # Category pipeline, status badges, Pandit / Mehendi / Dhol interview questions
│   ├── ideas/               # Themes, decor, activities, low/mid/high tiers, cost impact in INR
│   └── ai/                  # Business rule inspector & active API key badge indicator
├── test/                    # Comprehensive unit, integration, and accessibility tests (11 suites, 54 tests)
├── index.css                # Cohesive design system, dark mode tokens & printable schedule stylesheet
├── App.tsx                  # Main application orchestrator
└── main.tsx                 # Application entry point
```

---

## 5. Decision-Making Logic & Budget Calculation Approach

### Budget Mathematics:
1. **Contingency Reserve**:
   $$\text{Contingency Amount} = \text{round}(\text{Total Budget} \times \text{Contingency Rate})$$
2. **Total Estimated Costs**:
   $$\text{Total Estimated} = \sum (\text{Non-Contingency Expense Items}) + \text{Contingency Amount}$$
3. **Total Actual Realized Costs**:
   $$\text{Total Actual} = \sum (\text{Line Item Actual Cost or Invoiced Amount})$$
4. **Remaining Balance & Variance**:
   $$\text{Remaining Balance} = \text{Total Budget} - \text{Total Estimated}$$
   $$\text{Variance} = \text{Total Budget} - \text{Total Actual}$$
5. **Utilization Percentage**:
   $$\text{Utilization \%} = \frac{\text{Total Estimated}}{\text{Total Budget}} \times 100$$
6. **Per-Guest Metric**:
   $$\text{Per-Guest Cost} = \frac{\text{Total Estimated}}{\text{Guest Count}}$$

### Explicit Evaluated Business Rules:
* **Rule 1 (Over-Budget Detection)**: If $\text{Total Estimated} > \text{Total Budget}$, issues a high-priority warning detailing the exact dollar overrun and proposes practical trade-offs.
* **Rule 2 (Timeline Urgency & Past Dates)**: If event date is past, prompts date correction. If $< 14$ days remain, marks the event as "Short-Notice Urgent Triage" and flags critical paths.
* **Rule 3 (Weather Contingency for Outdoor Venues)**: When outdoor/park venues are selected, requires a covered canopy, tent deposit, or indoor backup room.
* **Rule 4 (Accessibility Accommodations)**: When accessibility requirements (step-free ramp, ASL interpreter, low-sensory room) are declared, enforces dedicated vendor checks.
* **Rule 5 (Large Gathering Logistics)**: When attendee count exceeds 250, prompts for municipal event permits, dedicated medical kits, and licensed security guards.
* **Rule 6 (RSVP Capacity Exceeded)**: When confirmed attending guests (+1s included) exceed the planned venue guest target, issues a warning with seat counts and catering adjustment advice.
* **Rule 7 (Special Dietary Requirements)**: When attending guests report dietary requirements (celiac, vegan, halal, nut allergies), issues a catering notification prompting meal plate tags 14 days before the event.

---

## 6. Offline Fallback & Deterministic Behavior

When no network connection or Gemini API key is provided, EventWise AI functions **100% locally and deterministically**:
1. Uses an expert planning rules engine calibrated across typical vendor distribution ratios:
   * **Venue**: ~25–35% of budget
   * **Catering**: ~28–38% of budget
   * **Decor & Florals**: ~8–14% of budget
   * **Entertainment**: ~7–12% of budget
   * **Photography/Video**: ~8–12% of budget
   * **Contingency**: 5–20% (user adjustable)
2. Generates complete date-aware tasks with realistic lead times (e.g. reserving venue 3–9 months prior, locking final catering headcount 10 days prior).
3. Generates complete Day-of Run of Show milestones with coordinator roles and setup buffers.
4. Generates representative initial guest rosters with RSVP tracking and dietary badges.

---

## 7. Security & Key Handling

* **Zero Local Storage of Sensitive Credentials**: API keys are held strictly in React component memory for the active browser session. They are **never** persisted to `localStorage`, cookies, or remote logs.
* **Input Sanitization**: All numbers are sanitized through `Math.max(0, ...)` with `isNaN` protections.
* **Safe External Links**: All calendar downloads and export actions trigger browser blobs with explicit filenames (`.ics`, `.json`), preventing unsafe redirects or remote execution.

---

## 8. Verification & Test Results

### Automated Test Suite:
```bash
npm test
```

### Actual Test Suite Results (11 Files, 53 Tests, 100% Passing):
```text
 ✓ src/test/guests.test.ts (5 tests)
 ✓ src/test/schedule.test.ts (3 tests)
 ✓ src/test/copilot.test.ts (5 tests)
 ✓ src/test/aiPlanner.test.ts (3 tests)
 ✓ src/test/timeline.test.ts (3 tests)
 ✓ src/test/fallbackPlanner.test.ts (3 tests)
 ✓ src/test/formatters.test.ts (5 tests)
 ✓ src/test/budget.test.ts (5 tests)
 ✓ src/test/decisionEngine.test.ts (7 tests)
 ✓ src/test/storage.test.ts (6 tests)
 ✓ src/test/components.test.tsx (8 tests)

 Test Files  11 passed (11)
      Tests  53 passed (53)
   Duration  9.84s
```

### Linter Results:
```bash
npm run lint
Found 0 warnings and 0 errors.
Finished in 75ms on 38 files with 115 rules using 12 threads.
```

### Production Build Results:
```bash
npm run build
vite v8.3.5 building client environment for production...
✓ 1955 modules transformed.
dist/index.html                   1.30 kB │ gzip:   0.72 kB
dist/assets/index-DeMX8klt.css    9.50 kB │ gzip:   2.53 kB
dist/assets/index-B_fMRwR0.js   385.76 kB │ gzip: 111.83 kB
✓ built in 2.18s
```

### Repository Size Audit:
* Git Objects Size: **~206 KiB** (Strictly within the 10 MB limit).
* Branches: Exactly **1 branch (`main`)**.

---

## 9. Reproducing the Main User Workflow

1. **Launch App**: Run `npm run dev` and open `http://localhost:5173`.
2. **Switch Themes**: Click the **Sun/Moon** icon in the header to toggle between sleek Dark Mode and high-contrast Light Mode.
3. **Ask Copilot**:
   * Click the **Ask Copilot** button in the header.
   * Click prompt chips like *"How do I trim 15% from my budget without impacting guests?"* or ask custom questions.
4. **Inspect Interactive Budget Donut**:
   * Navigate to **Budget Manager**.
   * Hover over the interactive SVG Donut slices to inspect spend allocation across categories.
   * View the **Actual Contract Invoices & Realized Spend** tracking strip.
   * Adjust the contingency buffer slider from 10% to 15% to see instant recalculations.
5. **Manage Guests & RSVPs**:
   * Navigate to **Guest List & RSVPs**.
   * View the 4 stat cards (Confirmed Attendance, Awaiting Response, Declined / Regrets, Special Dietary Needs).
   * Filter by status or search by guest name or dietary preference.
   * Click **Add Guest** to add attendees with plus-ones, dietary tags (vegan, celiac, nut allergy), and table assignments.
6. **Day-of Run of Show & Master Itinerary**:
   * Navigate to **Run of Show**.
   * View chronological milestone cards with coordinator roles, locations, and execution notes.
   * Click **Export iCal (.ics)** to sync all schedule milestones and reminders to Apple/Google Calendar.
   * Click **Print Sheet** to open a clean printable one-sheet for coordinators.
7. **Track Timeline & Tasks**:
   * Navigate to **Timeline & Tasks**.
   * Toggle task checkboxes to mark milestones complete.
   * Filter by *Upcoming*, *Overdue*, or *Completed*.
8. **Vet Vendors**:
   * Navigate to **Vendor Checklist**.
   * Click **Questions & Notes** on any vendor card to view tailored interview questions and update contract status.
9. **Export & Backup**:
   * Click **Export Plan** in the header to download the complete event plan as a JSON backup.
   * Click **Sync .ics** in the header to export the RFC 5545 calendar with automated advance alerts.
#   v i r t u a l 5  
 