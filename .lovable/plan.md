## Goal

The CI workflow already runs `bunx tsc --noEmit`, but a failure shows up as a raw log dump that's easy to miss in PR reviews. Make TypeScript errors impossible to ignore by:

1. Always running typecheck (even if Lint fails earlier in the job).
2. Capturing tsc output and posting a grouped, human-readable summary to the GitHub Actions **Step Summary** (the panel shown at the top of every PR check).
3. Emitting inline PR annotations via GitHub's `::error file=...` workflow command so failures appear directly on the offending lines in the PR diff.

No source code changes — only `.github/workflows/ci.yml`, a new helper script, and a `typecheck` npm script.

## Changes

### 1. `package.json`
Add a script so typecheck is runnable identically locally and in CI:
```json
"typecheck": "tsc --noEmit --pretty false"
```
(`--pretty false` keeps output in the stable `file(line,col): error TSxxxx: msg` format the parser expects.)

### 2. `scripts/summarize-tsc.mjs` (new)
Reads tsc output from stdin and:
- Counts errors, groups them by file, sorts by error count.
- Writes a Markdown table to `$GITHUB_STEP_SUMMARY` (totals, top files, first ~50 errors with file:line links).
- Re-emits each error as a GitHub annotation: `::error file=PATH,line=L,col=C::TSxxxx: message`.
- Exits with the original tsc exit code so the job still fails.

### 3. `.github/workflows/ci.yml`
Replace the current Typecheck step with:
```yaml
- name: Typecheck
  if: always()        # run even if Lint failed, so authors see both
  run: |
    set -o pipefail
    bun run typecheck 2>&1 | tee tsc.log | node scripts/summarize-tsc.mjs
```
And add a final guard step (also `if: always()`) that re-prints the summary path so it's discoverable in logs.

### Output example (Step Summary panel)

```text
TypeScript check failed — 7 errors across 3 files

| File                              | Errors |
| --------------------------------- | -----: |
| src/screens/JourneyScreen.tsx     |      4 |
| src/components/TransportCard.tsx  |      2 |
| src/hooks/useTransportTimeline.ts |      1 |

First errors:
- src/screens/JourneyScreen.tsx:837 — TS2304 Cannot find name 'JourneyTimelineMount'.
- src/components/TransportCard.tsx:61 — TS2300 Duplicate identifier 'extraction'.
...
```

## Out of scope

- No changes to lint, test, build steps.
- No changes to tsconfig or source files.
- No new CI jobs — keeps the existing single job to preserve concurrency/cancel behavior.

## Verification

- Run `bun run typecheck` locally to confirm the script works.
- Open a throwaway PR with one intentional type error to confirm the annotation appears on the diff and the Step Summary renders.
