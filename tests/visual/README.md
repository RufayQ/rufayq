# Visual regression tests

Pixel-level screenshot diffs for the chat inbox + people-search rows
in both LTR (English) and RTL (Arabic) modes.

## Running

```bash
# First time on a new machine — install the chromium binary:
bunx playwright install chromium

# Run all visual tests against a deterministic fixture page:
bunx playwright test

# Update baselines after an intentional design change:
bunx playwright test --update-snapshots

# Inspect a failing run:
bunx playwright show-report
```

The tests boot `bun run dev` automatically and hit the dev-only
harness route `/visual/chat-inbox?view=inbox|search&lang=en|ar`,
which renders fixed fixtures from `src/pages/VisualHarness.tsx`
(no Supabase, no network).

## Baselines

PNG baselines live in `tests/visual/__screenshots__/`. They are
checked into git so any drift shows up in PR diffs. The current
suite has 4 cases × 1 viewport (390×900, Pixel 5 emu) = 4 PNGs.

## When a snapshot fails

1. Look at the report (`bunx playwright show-report`) — it shows
   the expected, actual, and diff images side-by-side.
2. If the diff is an intentional design change, run with
   `--update-snapshots` and commit the new baselines.
3. If it's a regression, fix the component. Don't update the
   baseline to hide the bug.

## Cross-platform note

Font rendering can differ slightly between macOS, Linux, and CI.
The config allows up to 1% diff pixels (`maxDiffPixelRatio: 0.01`)
to absorb harmless anti-aliasing noise. If you see persistent
sub-pixel drift, generate baselines on the same OS as CI.
