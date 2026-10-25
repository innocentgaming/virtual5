# 🎬 EventWise AI — 90–120 Second Evaluator Demo Script (No Voiceover)

> **Purpose**: A concise, click-by-click video walkthrough guide for hackathon evaluators. Designed to be completely demonstrable without voiceover, showing the **core dynamic change-handling loop** (`Change → Impact → Quantified Trade-off → 1-Click Action → Undo`) within 60 seconds. Runs **100% offline** without network connectivity or API credits.

---

## ⚡ 0. Offline Verification (Pre-Flight Check)
1. **Disable Network / Turn off Wi-Fi** or disconnect internet.
2. Ensure no `VITE_GEMINI_API_KEY` is present in `.env` (or keep it blank).
3. Open `http://localhost:5173/` in Google Chrome / Chromium.
4. Verify the green offline indicator: all planning benchmarks, decision engines, and copilot capabilities run deterministically in browser memory.

---

## ⏱️ Step-by-Step 90-Second Walkthrough

### 0:00 – 0:20 | First-Run & Persona Selection
1. **Initial Screen**:
   - The application opens directly to **Aarav & Ananya's Royal Rajasthan Wedding** (Jaipur, ₹35,00,000 budget, 350 guests).
   - Point cursor to the header event switcher to show the 3 curated personas:
     - *Aarav & Ananya's Royal Rajasthan Wedding* (Destination Wedding, ₹35L)
     - *Rohan's 30th Bollywood Rooftop Bash* (Milestone Birthday, ₹3.5L)
     - *Shanti Vihar Grand Diwali & Dandiya Mela* (Community Festival, ₹6.5L)
   - Keep Aarav & Ananya active.

### 0:20 – 0:50 | The Core Problem Loop: "Try a Change" (Under 60 Seconds)
2. **Trigger Unexpected Chaos**:
   - Right on the Dashboard hero banner, observe the **Dynamic Change & Chaos Engine** callout.
   - Click the button: **`+20% Caterer Spike`**.
3. **Inspect Real-Time Impact**:
   - Notice the toast: *"✓ Caterer quote spike (+20%) simulated; see trade-offs below"*.
   - Scroll down to the **Needs Immediate Attention** section:
     - Notice **Rule 2: Vendor Cost Spike Escalation**: Caterer actual cost spiked to `₹14,40,000` (+₹2,40,000 over baseline).
     - Notice the live quantified trade-off cards generated:
       1. **Option 1**: *"Rebalance from Decor allocation"* (-₹1,44,000 decor trim).
       2. **Option 2**: *"Adjust Guest Count Target"* (Trim ~10 headcount).
       3. **Option 3**: *"Absorb via 12% Contingency Reserve"* (-₹2,40,000 buffer).
4. **1-Click Apply & Immediate Plan Update**:
   - Click **`Apply`** on Option 1 (*"Rebalance from Decor allocation"*).
   - Observe the toast: *"Applied trade-off: Rebalance from Decor allocation"*.
   - The decor budget is automatically trimmed, variance clears, and the change is recorded.
5. **Verify Undoability**:
   - Notice the button in the hero banner now reads: **`Undo (1)`**.
   - Click **`Undo (1)`**.
   - Observe the toast: *"✓ Rolled back last change from history"*.
   - The plan state returns to previous snapshot seamlessly.

### 0:50 – 1:15 | Deep Scenario Stress-Testing ("What Changed?")
6. **Open Scenario Engine**:
   - Click **`Simulate Scenario / What Changed?`** button.
   - The Scenario Modal appears with live sliders and presets:
     - Guest Count Slider (e.g. `+50 Guests`)
     - Vendor Quote Spike Slider (`+15%`)
     - Target Date Shift (`Rush Date` / `Postpone Date`)
     - Venue Type Switch (`Outdoor Lawn` vs `Indoor Banquet Hall`)
     - Cancelled Vendor Picker (`Royal Halwai & Caterer`)
7. **Simulate Outdoor Weather Risk**:
   - Switch Venue Layout to **`Outdoor Lawn`**.
   - Notice the Live Impact Alert: *"Outdoor Lawn selected — weather contingency activated; 10 PM sound curfew applies"*.
   - Notice trade-offs offered: *"Reserve Waterproof Canopy Tent"* or *"Migrate Ceremony Indoors"*.
   - Close modal.

### 1:15 – 1:35 | India-First Cultural Guardrails & Grounded Copilot
8. **Inspect Indian Cultural Guardrails**:
   - Click **`Run of Show`** tab:
     - Observe the **10:00 PM Sound Curfew Divider**: *"Curfew: Move Indoors (10:00 PM)"* with municipal guidance caveat for Jaipur.
     - Observe Vedic milestones: *Haldi*, *Baraat Procession*, *Varmala*, *Vedic Pheras & Kanyadaan*, *Shahi Bhojan*.
   - Click **`Guest List & RSVPs`** tab:
     - Observe the persistent **Jain & Pure Veg kitchen counter notice**: *"Dedicated kitchen counter active for 1 Jain and 1 Pure Veg guests"*.
9. **Inspect Grounded AI Copilot (Drawer)**:
   - Click the floating **AI Copilot** button (bottom right) or header icon.
   - Click starter chip: **`How to cut ₹50K from catering budget?`**.
   - Notice the copilot answers using **real snapshot figures**:
     - References actual budget `₹35,00,000`, catering cost `₹12,00,000`, and `12%` buffer.
     - Appends an actionable **Grounded Action Proposal**: `[Apply this change]`.
     - Zero hallucinated vendor names, zero fake phone numbers, and zero attendee PII leaked.
   - Close copilot drawer.

### 1:35 – 1:45 | Offline Calendar & Print Execution
10. **Export & Day-of Handoff**:
    - Click **`Export Calendar (.ics)`** in the header.
    - Notice instant browser download of `eventwise-wedding-*.ics` with RFC 5545 compliant alarms (`-P1D` reminders).
    - Under Run of Show, click **`Print Schedule`** to demonstrate clean print CSS styling.

---

## 🔍 Evaluator Verification Checklist

| Time Elapsed | Target Action | Verification Criteria |
| :--- | :--- | :--- |
| **0:15** | Persona Switcher | 3 distinct personas with complete data sets (Wedding, Birthday, Community). |
| **0:35** | `+20% Caterer Spike` | Instant calculation of ₹ variance and 3 concrete trade-off options. |
| **0:45** | `Apply` & `Undo` | State updates deterministically; 1-click Undo restores prior snapshot. |
| **1:05** | Scenario Modal | Real-time parameter stress-testing for guests, dates, venue, and cancellations. |
| **1:20** | Indian Guardrails | ₹ and Lakhs/Crores everywhere, Jain kitchen segregation, 10 PM sound curfew guidance. |
| **1:35** | Grounded Copilot | Answers grounded in active plan snapshot; structured action cards; zero PII. |
| **1:45** | Offline Execution | 100% functional with network turned off; no API key required. |
