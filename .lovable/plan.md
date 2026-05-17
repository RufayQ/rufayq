## Why this plan

Audit of `src/screens/CareHubScreen.tsx` confirms the three pain points:

1. **Medical Care is empty for signed-in users.** Lines 145–191 render Lifestyle if selected, otherwise `!isGuest` returns a static "Your recovery hub is ready" card with no tabs and no CTA. Only guests ever see the Care Plan / Videos / Education / FAQs / Nutrition / Exercises sub-tabs.
2. **Menu is generic and broken.** `careMenuItems` always offers Copy / Export / Share of a hard-coded demo plan, even when no plan exists.
3. **Nothing creates care plans or appointments.** Tasks are local `useState`. Appointments come from `useAppointments` but there's no add path inside Care Hub.

## What changes

### 1. Unify Medical Care for everyone
Drop the `!isGuest` placeholder branch. Render the same sub-tab bar + content for both guests and signed-in users. The Care Plan tab already handles empty data (provider feed, follow-ups, tasks). Guests keep the demo "Post-Op Day 5" status chip; signed-in users see live data with empty-state nudges.

### 2. Care Plan creation experience
Replace the static `tasks` array in `CarePlanTab` with a persistent **Care Plan** model stored in `localStorage` (mirroring `lifestyleStore`'s cache-first pattern; promotable to Supabase later).

- Each task: `{ id, en, ar, category, time?, done, repeat? }`
- Categories with icons: **Medication 💊 · Exercise 🏃 · Wound Care 🩹 · Vitals 🌡️ · Hydration 💧 · Rest 😴 · Custom ✨**
- New **+ Add task** button at the top of the task list opens `AddCarePlanTaskSheet` — bottom sheet with: category picker (chips), bilingual title (EN + AR, dir="auto"), optional time, optional repeat (Daily / Weekdays / Custom days).
- Tasks group visually by category with section headers; done items collapse to the bottom.
- Empty state with friendly bilingual nudge + the same Add CTA.

### 3. Appointment add path
A **+ Appointment** secondary button next to + Add task opens `AddAppointmentSheet`:
- Visit type chips: **Consultation · Follow-up · Surgery · Lab · Imaging · Physio**
- Title, date+time, provider/clinic (free text), notes
- Saves via existing `appointmentApi` for signed-in users; falls back to localStorage for guests (same dual pattern Lifestyle uses).
- Newly-added follow-ups automatically appear in the existing **Post-Travel Follow-Ups** block.

### 4. Redesigned header menu
The current 3-item demo menu becomes a contextual menu that adapts to whether a plan exists:

**When plan is empty:**
- ✨ Start a care plan (opens the add-task sheet)
- 📅 Add appointment
- 🎓 Browse education
- ❓ Open FAQs

**When plan has tasks:**
- ➕ Add task
- 📅 Add appointment
- 📋 Copy plan (real content, not demo)
- ⬇️ Export plan (.txt)
- 🔄 Reset plan (with confirm)

Menu items get clear icons + bilingual labels (already supported by `HeaderMenuItem`).

### 5. Segment switcher polish
The Medical Care ↔ Lifestyle toggle stays where it is but gets:
- Visible focus ring + `aria-controls`
- Persists last segment to localStorage so users land where they left off
- Restored sub-tab also persists per segment

## Files

```text
edit   src/screens/CareHubScreen.tsx
        - remove !isGuest empty-state branch
        - dynamic careMenuItems (empty vs populated)
        - persist segment + activeTab to localStorage
        - wire AddCarePlanTaskSheet + AddAppointmentSheet
new    src/features/carehub/careplan/carePlanStore.ts
        - localStorage CRUD, subscribe(), categories enum, default seed
new    src/features/carehub/careplan/AddCarePlanTaskSheet.tsx
        - bottom sheet, category chips, time picker, repeat picker
new    src/features/carehub/careplan/AddAppointmentSheet.tsx
        - bottom sheet, visit-type chips, saves via appointmentApi (or LS for guests)
edit   mem://features/care-hub
        - document new add flows + contextual menu
```

## Out of scope (deferred)

- Server-side care plan table (Phase 2 — same localStorage-first path as Lifestyle).
- Calendar integration / .ics export for appointments.
- Provider-prescribed task acceptance flow (already partly handled by `ProviderFeedCard`).
- Reordering / drag-and-drop of tasks.

## One thing to confirm

For signed-in users with no provider-shared instructions, do you want the Care Plan tab to **start empty with a nudge**, or to **seed a starter template** (the same 6-task post-op example currently hard-coded) the user can then edit/delete? I recommend **start empty + one-tap "Use starter template"** chip so real users aren't surprised by mock data, but tell me if you prefer one over the other.
