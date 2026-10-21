# EventWise AI — Intelligent, Personalized Event Planning Assistant (v1.1.0)

An intelligent, full-stack, personalized event planning assistant that helps users organize **Weddings**, **Birthdays**, and **Community Events** with context-aware recommendations, dynamic budget management, interactive visual analytics, date-aware preparation schedules, Day-of Run of Show itineraries, RSVP & dietary tracking, vendor interview checklists, and an explainable decision engine.

---

## 1. Chosen Vertical & Problem Statement

* **Primary Vertical**: Event Planning Assistant (Focused exclusively on Weddings, Birthdays, and Community Gatherings).
* **Problem Statement**: Organizing events is fraught with budgeting blind spots, missed timeline milestones, opaque vendor interactions, chaotic day-of coordination, and planning paralysis. Most generic tools are either static spreadsheets or simplistic to-do checklists that lack contextual intelligence. EventWise AI solves this by converting event specifications (guest counts, budget, target dates, venue styles, food preferences, cultural traditions, and accessibility needs) into a cohesive, realistic, and actionable event roadmap.

---

## 2. Problem Being Solved & Target Users

### Problems Solved:
1. **Unrealistic Budgeting & Cost Overruns**: Real-time business rules identify when projected spend exceeds total funds, actively offering specific line-item cuts and substitutions (e.g., buffet vs. plated dining, floral alternatives, digital invitations), paired with an interactive SVG donut chart and contract invoice tracking.
2. **Timeline Compression & Short-Notice Scrambling**: Automatically recalculates milestone deadlines based on the planning horizon (long-range vs. short-notice < 21 days), surfacing urgent critical-path tasks immediately and exporting them directly to calendar apps via RFC 5545 iCalendar (`.ics`).
3. **Day-of Execution Chaos**: Replaces scattered notes with a unified Day-of Run of Show master itinerary, assigning coordinators, vendor load-ins, buffer windows, and printable one-sheets.
4. **Guest & RSVP Dietary Blindspots**: Automatically tracks attendance, plus-ones, table seating, and audits venue capacity against confirmed RSVPs while tallying dietary requirements (celiac, vegan, halal, nut allergies) for catering briefings.
5. **Vendor Interview Uncertainty & Hallucination Prevention**: Avoids fake vendor profiles; instead, provides structured vendor category tracking, contact logging, and tailored interview questions users must ask prospective vendors.

### Target Users:
* **Couples & Families** planning intimate or large-scale weddings.
* **Individuals & Parents** organizing milestone birthdays and private celebrations.
* **Community Organizers, Non-Profits & Neighborhood Leaders** coordinating civic galas, cultural festivals, and fundraisers.

---

## 3. Core Features & Key Differentiators

| Feature | Description | Key Differentiator |
| :--- | :--- | :--- |
| **Smart AI Event Planner** | Generates tailored plans for weddings, birthdays, and community events based on headcount, location, budget, and priorities. | Explains **why** choices were made; generates tiered alternatives (Budget, Balanced, Premium). |
| **Interactive Budget Analytics & Actuals** | Visual SVG Donut chart with animated slice hover, category commitment %, and actual invoice vs. budget tracking. | Configurable contingency reserve (0–25%), live utilization tracker, and automated per-person cost scaling. |
| **Guest List & RSVP Manager** | Tracks attendees, plus-ones, response status (`attending`, `pending`, `declined`), and table assignments. | Audits confirmed headcount against venue capacity and tallies dietary requirements for caterers. |
| **Day-of Run of Show & Itinerary** | Minute-by-minute execution schedule for vendors, coordinators, and hosts with roles, locations, and notes. | Includes one-click printable run sheet and calendar sync with automated reminders. |
| **RFC 5545 iCalendar (.ics) Sync** | Exports milestones, tasks, and day-of itinerary directly to Apple, Google, and Outlook calendars. | Injects automated `-P1D` (1-day advance) alarms for critical contract deadlines. |
| **AI Copilot Drawer** | Slide-in planning assistant offering grounded advice on budget cuts, catering questions, and timeline critical paths. | Contextually aware of active event data; zero external dependencies required for core advice. |
| **Date-Aware Timeline** | Intelligent preparation schedule adjusting milestones dynamically based on days remaining until the event. | Automatic overdue detection, short-notice triage warnings (< 14 and < 21 days), and milestone dependencies. |
| **Vendor Checklist & Interview Guide** | Pipeline tracking (`Not Started` → `Contacted` → `Shortlisted` → `Booked` → `Completed`). | Category-specific vetting questions. Zero fabrication of fake vendor names or phony review scores. |
| **Explainable Decision Engine** | Real-time rule evaluator checking budgets, venue weather contingency, attendee scaling, and accessibility. | 100% deterministic offline engine that runs without requiring external APIs or network connectivity. |
| **Theme System & Dark Mode** | Dual light/dark mode and event-specific color palettes (`wedding`, `birthday`, `community`). | WCAG AA contrast compliant with persistent theme preference in localStorage. |

---

## 4. Technology Stack & Architecture

* **Frontend**: React 19, TypeScript (~6.0), Vite 8.
* **Design & Styling**: Custom responsive CSS design system with CSS custom properties, WCAG AA color tokens, responsive fluid grid, dark mode tokens (`data-color-mode="dark"`), and event-type thematic palettes (`data-theme="wedding"`, `data-theme="birthday"`, `data-theme="community"`).
* **Iconography**: Lucide React.
* **Testing Framework**: Vitest 5, React Testing Library 16, `@testing-library/jest-dom`, JSDOM.
* **Linter**: Oxlint.
* **AI Provider (Optional)**: Google Gemini API (Gemini 1.5 Flash) via native HTTPS fetch with abort controller timeout protection, plus grounded deterministic copilot fallback.

### Architecture Directory Structure:
```
src/
├── types/
│   └── event.ts             # Domain models (EventPlan, BudgetItem, TaskItem, VendorItem, GuestItem, ScheduleItem, DecisionInsight)
├── services/
│   ├── decisionEngine.ts    # Business rule engine, budget math, timeline auditor, RSVP capacity & dietary checks
│   ├── fallbackPlanner.ts   # Deterministic expert planning engine with tiered recommendations & default schedules/guests
│   ├── aiPlanner.ts         # Optional Gemini API integration with schema validation & fallback
│   ├── calendarService.ts   # RFC 5545 iCalendar (.ics) generation and download service with VALARM triggers
│   ├── copilotService.ts    # Grounded AI Copilot assistant with contextual recommendations
│   └── storageService.ts    # LocalStorage manager with corrupted JSON recovery & schema validator
├── data/
│   └── sampleEvents.ts      # Curated templates for Wedding, Birthday, and Community Gala
├── hooks/
│   └── useEventPlan.ts      # Central state hook with persistence, recalculation & dispatch
├── components/
│   ├── layout/              # Header with theme toggle, Copilot trigger, iCal sync, and Responsive Navigation
│   ├── dashboard/           # Metrics cards, countdown, utilization bar, urgent alerts, quick action shortcuts
│   ├── setup/               # Wizard form for event creation/editing with input validation
│   ├── budget/              # Interactive SVG Donut chart, invoice contract tracking, expense table, contingency slider
│   ├── timeline/            # Date-aware schedule, status filters, overdue badges
│   ├── guests/              # Guest list, RSVP tracker, dietary counters, search, and add/edit modal
│   ├── schedule/            # Day-of Run of Show, milestone cards, coordinator roles, iCal & print buttons
│   ├── copilot/             # Slide-in AI Copilot drawer with suggested prompt chips and chat thread
│   ├── vendors/             # Category pipeline, status badges, vendor interview questions
│   ├── ideas/               # Themes, decor, activities, low/mid/high tiers, cost impact
│   └── ai/                  # Business rule inspector & optional session API key configuration
├── utils/
│   └── formatters.ts        # Currency (en-US), number and percentage formatting utilities
├── test/                    # Comprehensive unit, integration, and accessibility tests (11 suites, 53 tests)
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