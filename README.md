# EventWise AI — Intelligent, Personalized Event Planning Assistant

An intelligent, full-stack, personalized event planning assistant that helps users organize **Weddings**, **Birthdays**, and **Community Events** with context-aware recommendations, dynamic budget management, date-aware preparation schedules, vendor interview checklists, and an explainable decision engine.

---

## 1. Chosen Vertical & Problem Statement

* **Primary Vertical**: Event Planning Assistant (Focused exclusively on Weddings, Birthdays, and Community Gatherings).
* **Problem Statement**: Organizing events is fraught with budgeting blind spots, missed timeline milestones, opaque vendor interactions, and planning paralysis. Most generic tools are either static spreadsheets or simplistic to-do checklists that lack contextual intelligence. EventWise AI solves this by converting event specifications (guest counts, budget, target dates, venue styles, food preferences, cultural traditions, and accessibility needs) into a cohesive, realistic, and actionable event roadmap.

---

## 2. Problem Being Solved & Target Users

### Problems Solved:
1. **Unrealistic Budgeting & Cost Overruns**: Real-time business rules identify when projected spend exceeds total funds, actively offering specific line-item cuts and substitutions (e.g., buffet vs. plated dining, floral alternatives, digital invitations).
2. **Timeline Compression & Short-Notice Scrambling**: Automatically recalculates milestone deadlines based on the planning horizon (long-range vs. short-notice < 21 days), surfacing urgent critical-path tasks immediately.
3. **Vendor Interview Uncertainty & Hallucination Prevention**: Avoids fake vendor profiles; instead, provides structured vendor category tracking, contact logging, and tailored interview questions users must ask prospective vendors.
4. **Accessibility & Dietary Blindspots**: Automatically audits venue accessibility (step-free ramps, quiet low-sensory corners) and dietary protocols (halal, celiac, vegan labeling) based on attendee requirements.

### Target Users:
* **Couples & Families** planning intimate or large-scale weddings.
* **Individuals & Parents** organizing milestone birthdays and private celebrations.
* **Community Organizers, Non-Profits & Neighborhood Leaders** coordinating civic galas, cultural festivals, and fundraisers.

---

## 3. Core Features & Key Differentiators

| Feature | Description | Key Differentiator |
| :--- | :--- | :--- |
| **Smart AI Event Planner** | Generates tailored plans for weddings, birthdays, and community events based on headcount, location, budget, and priorities. | Explains **why** choices were made; generates tiered alternatives (Budget, Balanced, Premium). |
| **Dynamic Budget Manager** | Categorizes expenses across venue, catering, decor, photography, entertainment, logistics, and contingency. | Configurable contingency reserve (0–25%), live utilization tracker, and automated per-person cost scaling. |
| **Date-Aware Timeline** | Intelligent preparation schedule adjusting milestones dynamically based on days remaining until the event. | Automatic overdue detection, short-notice triage warnings (< 14 and < 21 days), and prerequisite milestone dependencies. |
| **Vendor Checklist & Interview Guide** | Pipeline tracking (`Not Started` → `Contacted` → `Shortlisted` → `Booked` → `Completed`). | Category-specific vetting questions. Zero fabrication of fake vendor names or phony review scores. |
| **Decision Engine** | Real-time rule evaluator checking budgets, venue weather contingency, attendee scaling, and accessibility. | 100% deterministic offline engine that runs without requiring external APIs or network connectivity. |
| **Data Persistence & Privacy** | Browser LocalStorage engine with schema validation, corrupted data protection, and export/import capability. | Safe corrupted data recovery; strictly zero storage of private keys or card data in localStorage. |

---

## 4. Technology Stack & Architecture

* **Frontend**: React 19, TypeScript (~6.0), Vite 8.
* **Design & Styling**: Custom responsive CSS design system with CSS custom properties, WCAG AA color tokens, responsive fluid grid, and event-type thematic palettes (`data-theme="wedding"`, `data-theme="birthday"`, `data-theme="community"`).
* **Iconography**: Lucide React.
* **Testing Framework**: Vitest 5, React Testing Library 16, `@testing-library/jest-dom`, JSDOM.
* **Linter**: Oxlint.
* **AI Provider (Optional)**: Google Gemini API (Gemini 1.5 Flash) via native HTTPS fetch with abort controller timeout protection.

### Architecture Directory Structure:
```
src/
├── types/
│   └── event.ts             # Domain models (EventPlan, BudgetItem, TaskItem, VendorItem, DecisionInsight)
├── services/
│   ├── decisionEngine.ts    # Business rule engine, budget math, and timeline task auditor
│   ├── fallbackPlanner.ts   # Deterministic expert planning engine with tiered recommendations
│   ├── aiPlanner.ts         # Optional Gemini API integration with schema validation & fallback
│   └── storageService.ts    # LocalStorage manager with corrupted JSON recovery & schema validator
├── data/
│   └── sampleEvents.ts      # Curated templates for Wedding, Birthday, and Community Gala
├── hooks/
│   └── useEventPlan.ts      # Central state hook with persistence, recalculation & dispatch
├── components/
│   ├── layout/              # Header, Event Switcher, and Responsive Navigation
│   ├── dashboard/           # Metrics cards, countdown, utilization bar, urgent alerts
│   ├── setup/               # Wizard form for event creation/editing with input validation
│   ├── budget/              # Category breakdown, expense table, contingency slider, warnings
│   ├── timeline/            # Date-aware schedule, status filters, overdue badges
│   ├── vendors/             # Category pipeline, status badges, vendor interview questions
│   ├── ideas/               # Themes, decor, activities, low/mid/high tiers, cost impact
│   └── ai/                  # Business rule inspector & optional session API key configuration
├── utils/
│   └── formatters.ts        # Currency (en-US), number and percentage formatting utilities
├── test/                    # Comprehensive unit, integration, and accessibility tests
├── index.css                # Cohesive design system & responsive layout styles
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
3. **Remaining Balance & Deficit**:
   $$\text{Remaining Balance} = \text{Total Budget} - \text{Total Estimated}$$
4. **Utilization Percentage**:
   $$\text{Utilization \%} = \frac{\text{Total Estimated}}{\text{Total Budget}} \times 100$$
5. **Per-Guest Metric**:
   $$\text{Per-Guest Cost} = \frac{\text{Total Estimated}}{\text{Guest Count}}$$

### Explicit Evaluated Business Rules:
* **Rule 1 (Over-Budget Detection)**: If $\text{Total Estimated} > \text{Total Budget}$, issues a high-priority warning detailing the exact dollar overrun and proposes practical trade-offs (e.g. buffet vs. plated dining, digital invitations).
* **Rule 2 (Timeline Urgency & Past Dates)**: If event date is past, prompts date correction. If $< 14$ days remain, marks the event as "Short-Notice Urgent Triage" and flags critical paths.
* **Rule 3 (Per-Person Scaling)**: If guest count shifts, per-person expense line items (catering, favors) dynamically re-scale and warn if per-guest budget falls below \$35.
* **Rule 4 (Outdoor Weather Contingency)**: When outdoor/garden/park/beach venue is selected, reminds organizers to reserve marquee tents with sidewalls and climate control without claiming a live weather forecast.
* **Rule 5 (Accessibility Injection)**: When mobility or sensory needs are declared, injects step-free checks, companion seating, and dietary allergen signage into timeline milestones and vendor vetting questions.
* **Rule 6 (Incomplete Input Handling)**: Transparently flags missing budgets or dates and prompts targeted questions rather than fabricating facts.

---

## 6. AI Integration & Deterministic Fallback Behavior

1. **Dual Planning Modes**:
   * **Deterministic Rule Engine (Default & Offline)**: Generates complete, date-calibrated, and mathematically sound plans instantly.
   * **GenAI Assisted (Optional)**: If `VITE_GEMINI_API_KEY` is provided in `.env` or entered temporarily in the session UI, EventWise AI queries Gemini 1.5 Flash.
2. **Strict Schema Validation & Graceful Fallback**:
   * The AI service enforces a strict JSON schema. If the API returns invalid JSON, HTTP errors (e.g. 429 rate limit or 500 server error), or takes longer than 12 seconds (AbortController), the system seamlessly catches the exception and falls back to the deterministic rule planner.
3. **Truth in Advertising**:
   * All prices are explicitly tagged as **estimates** based on regional benchmarks in the selected city.
   * The system never invents real vendor phone numbers, availability calendar slots, or bogus testimonials.

---

## 7. Installation & Setup Instructions

### Prerequisites:
* **Node.js**: v18.0.0 or later (tested on Node v24.19.0).
* **npm**: v9.0.0 or later (tested on npm 11.17.0).

### Steps:
```bash
# 1. Clone or navigate to the repository directory
cd d:/challege5

# 2. Install dependencies
npm install

# 3. (Optional) Set up your Gemini API key in .env
cp .env.example .env
# Edit .env and supply VITE_GEMINI_API_KEY if desired
```

---

## 8. Environment Variable Configuration

Create a `.env` file in the root directory (based on `.env.example`):
```env
# Optional Gemini API key
VITE_GEMINI_API_KEY=your_gemini_api_key_here
```
*Note: If omitted, the application runs entirely on its deterministic offline rule engine with full features active.*

---

## 9. How to Run the Application & Tests

```bash
# Run local development server
npm run dev

# Run automated test suite with Vitest
npm test

# Run linter
npm run lint

# Build production bundle
npm run build

# Preview production build locally
npm run preview
```

---

## 10. Assumptions & Limitations

* **Planning Estimates, Not Live Quotes**: Prices and allocations reflect realistic market medians (e.g. \$40–\$85/head for buffets, \$85–\$160/head for plated meals). Actual quotes will vary by vendor contract and seasonal demand.
* **Browser LocalStorage Scope**: Stored plans are persisted per browser origin. Clearing browser cache resets the plan to default sample templates (Elena & Marcus Wedding, Jordan's Birthday, Riverside Festival). A full JSON Export button is provided for backups.
* **Currency**: Defaults to USD ($), formatted with standard integer separators.

---

## 11. Security, Privacy & Accessibility

* **Credential Protection**: API keys are never stored in localStorage, cookies, or git commits. User-entered keys remain in temporary React state during the active session.
* **Sanitization**: All user-provided fields (titles, notes, vendor names) are safely rendered using React JSX text nodes, eliminating XSS vulnerabilities.
* **Zero Payment Data**: The MVP does not process credit cards or sensitive financial credentials.
* **Accessibility (WCAG AA)**:
  * Semantic HTML5 elements (`<header role="banner">`, `<nav aria-label="...">`, `<main>`, `<footer role="contentinfo">`, `<section>`).
  * Contrast-compliant text tokens (`#0f172a` text on `#ffffff` / `#f8fafc` backgrounds).
  * Form inputs have descriptive, programmatic `<label>` associations and helper text.
  * Form validation errors announce with `role="alert"`.
  * Keyboard navigable tab controls and visible focus rings (`:focus-visible`).

---

## 12. Automated Test Commands & Actual Results

### Command Executed:
```bash
npm test
```

### Actual Test Suite Results:
```text
 ✓ src/test/aiPlanner.test.ts (3 tests)
 ✓ src/test/timeline.test.ts (3 tests)
 ✓ src/test/fallbackPlanner.test.ts (3 tests)
 ✓ src/test/formatters.test.ts (5 tests)
 ✓ src/test/budget.test.ts (5 tests)
 ✓ src/test/decisionEngine.test.ts (7 tests)
 ✓ src/test/storage.test.ts (6 tests)
 ✓ src/test/components.test.tsx (8 tests)

Test Files  8 passed (8)
     Tests  40 passed (40)
  Duration  6.86s
```

### Linter Results:
```text
npm run lint
Found 0 warnings and 0 errors.
Finished in 47ms on 29 files with 115 rules using 12 threads.
```

### Production Build Results:
```text
npm run build
vite v8.3.5 building client environment for production...
✓ 1949 modules transformed.
dist/index.html                   1.30 kB │ gzip:  0.72 kB
dist/assets/index-CpAikywP.css    8.27 kB │ gzip:  2.25 kB
dist/assets/index-BFO6G_zz.js   336.52 kB │ gzip: 99.16 kB
✓ built in 1.29s (Exit Code: 0)
```

---

## 13. Reproducing the Main User Workflow

1. **Launch App**: Run `npm run dev` and open `http://localhost:5173`.
2. **Explore Sample Events**: Use the header event selector to view pre-loaded events:
   * *Elena & Marcus Autumn Wedding* (San Francisco, CA)
   * *Jordan's 30th Birthday* (Austin, TX)
   * *Riverside Arts & Harvest Festival* (Denver, CO)
3. **Create a Custom Event**:
   * Click **New Event** in the header.
   * Choose **Wedding**, **Birthday**, or **Community**.
   * Enter city, target date, guest count (e.g. `120`), and budget (e.g. `24000`).
   * Select venue type (e.g. *Garden / Public Park*), food style (*Buffet*), and accessibility needs (*Wheelchair ramp, Gluten-free*).
   * Click **Generate Event Plan**.
4. **Inspect Dashboard & Decision Insights**:
   * View the countdown timer, budget utilization bar, task completion percentage, and active rule notices (e.g., outdoor rain plan reminder, accessibility accommodations).
5. **Manage the Budget**:
   * Navigate to **Budget Manager**.
   * Adjust the contingency reserve slider from 10% to 15% to see instant recalculations.
   * Click **Add Custom Expense** (e.g. "String Quartet", \$1,200) to see totals and category distributions update live.
   * Test over-budget protection: Increase an expense beyond the budget to view the red deficit banner and cost-saving tips.
6. **Track Timeline & Tasks**:
   * Navigate to **Timeline & Tasks**.
   * Toggle task checkboxes to mark milestones complete.
   * Filter by *Upcoming*, *Overdue*, or *Completed*.
   * Click **Add Task** to insert custom deadlines.
7. **Vet Vendors**:
   * Navigate to **Vendor Checklist**.
   * Click **Questions & Notes** on any vendor card to view tailored interview questions.
   * Update vendor status from `Not Started` to `Contacted` or `Booked`.
8. **Review Personalized Ideas**:
   * Navigate to **Personalized Ideas** to review curated concepts across Budget, Balanced, and Premium tiers.
   * Click **Regenerate Suggestions** to refresh concepts without losing custom items.
9. **Export**:
   * Click **Export Plan** in the header to download the complete event plan as a JSON backup.
