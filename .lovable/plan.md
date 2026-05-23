# Expand Demographics card with new fields + expand/collapse

## Goal
Replace "Language" in the Demographics card with three more meaningful fields and add an expand toggle on the card. Wire the new fields end-to-end (DB → API → edit sheet → display).

## New demographic fields
1. **Marital Status** — single / married / divorced / widowed (with Arabic labels)
2. **City of Residence** — text, intelligently linked to the user's `nationality` (suggests cities for that country; free text fallback)
3. **Occupation** — free text

## Changes

### 1. Database (migration)
Add three nullable columns to `public.profiles`:
- `marital_status text` (constrained via trigger to: single | married | divorced | widowed | null)
- `city_of_residence text`
- `occupation text`

No RLS changes — existing device-scoped policies already cover these columns.

### 2. `src/components/profile/DemographicsCard.tsx`
- Select `marital_status, city_of_residence, occupation` from profiles (drop `preferred_language` and the localStorage language read).
- Default view (collapsed): show 4 key cells in a 2×2 grid — DOB, Gender, Nationality, City.
- Add an **Expand / Collapse** chevron toggle in the header (next to Edit).
- Expanded view: reveal additional rows for Marital Status, Occupation, and the originally hidden ones.
- Wire `onEdit("demo")` to open ProfileEditSheet on the demographics tab.

### 3. `src/components/profile/ProfileEditSheet.tsx`
In the Demographics tab, after Nationality, add:
- **Marital Status** select (4 options, bilingual labels).
- **City of Residence** — combobox input that suggests cities based on selected `nationality` (use existing `src/data/cities.ts` if it has country mapping; otherwise plain text input with a country-aware placeholder).
- **Occupation** — text input.
Include all three in the `upsert` payload and in the initial fetch.

### 4. City suggestion source
Use `src/data/cities.ts` if it exposes a country→cities map. If not present, fall back to a free-text input with a hint like "City in {country}". (Will confirm during build by reading cities.ts.)

## Out of scope
- No changes to medical section, disclaimer, avatar uploader, or other profile pieces.
- No changes to existing language preference (still lives in Settings / localStorage).
