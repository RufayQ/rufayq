# Per-release reports

This directory is **auto-populated** by `.github/workflows/release-android.yml`
on every tag push. Each successful build writes:

- `<tag>.md`   — human-readable report (also attached to GitHub Release)
- `<tag>.html` — same content, standalone HTML for non-Markdown viewers

Do not edit these files by hand **except** to append rows to the
"Promotion log" table when manually promoting a build between tracks.

See `docs/release-runbook.md` for the full release flow.
