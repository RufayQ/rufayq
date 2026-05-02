# Android Release Runbook

The single source of truth for **which git tag to push** and **what CI will
do with it**. Pin this page in your release tracker.

---

## 1. Tag → track cheat sheet

| Tag pattern         | What CI uploads     | Play track | Status   |
|---------------------|---------------------|------------|----------|
| `v1.2.3`            | Signed AAB          | internal   | draft    |
| `v1.2.3-internal`   | Signed AAB          | internal   | draft    |
| `v1.2.3-alpha`      | Signed AAB          | alpha      | draft    |
| `v1.2.3-beta`       | Signed AAB          | beta       | draft    |
| _(no tag — branch push)_ | Nothing — CI only runs lint/test/build | — | — |

> **Production is never reached by a tag push.** It is only reachable through
> the `Promote Android release` workflow (§5), which requires manual approval.

### Examples

```bash
# First internal build of 0.1.0 (default track)
git tag v0.1.0 && git push --tags

# Same versionName, but explicit "internal"
git tag v0.1.0-internal && git push --tags

# Same code, promoted by re-tagging? NO — re-use Promote workflow instead.
# A new AAB always needs a new versionCode (see §3).

# Closed alpha candidate
git tag v0.2.0-alpha && git push --tags

# Open beta candidate
git tag v0.3.0-beta && git push --tags
```

---

## 2. What pushing a tag actually does (step-by-step)

When you run `git tag v0.1.0 && git push --tags`:

1. GitHub receives the new tag matching `v*`.
2. The **Android release** workflow starts.
3. **Preflight job** runs first (≈30 s):
   - Confirms required secrets are present and well-formed.
   - Resolves the Play track from the tag suffix.
   - Fails fast with a clear error if anything is wrong — no wasted build.
4. **Build-and-publish job** (≈12–18 min):
   1. Bun install → Vite build.
   2. `npx cap sync android`.
   3. Decode keystore from secret, validate alias + passwords + expiry.
   4. _(Optional)_ Cross-check upload-cert SHA-256 against Play (§7).
   5. `gradlew bundleRelease` → produces `app-release.aab`.
   6. `apksigner verify` the AAB.
   7. Generate per-release report at `docs/releases/<tag>.{md,html}`.
   8. Attach AAB + report to **GitHub Releases → `<tag>`**.
   9. Upload AAB to **Play Console** in the resolved track, **status = draft**.
5. You receive a workflow-success email with a link to:
   - The GitHub Release (download the AAB).
   - The Play Console draft (review and click **Send for review**).

> The first draft will land in Play Console as soon as the **upload** step
> completes. To verify: Play Console → All apps → Rufayq → Testing →
> _(your track)_ → you'll see _Release: Draft, version code N_.

---

## 3. Pre-tag checklist (do this BEFORE `git tag`)

- [ ] `versionCode` in `android/app/build.gradle` is **strictly greater** than
      the last upload (Play rejects re-uploads of the same code).
- [ ] `versionName` matches the tag (`v1.2.3` → `versionName "1.2.3"`).
- [ ] `CHANGELOG.md` has bilingual user-visible bullets for this version.
- [ ] All P0/P1 smoke tests in `docs/android-build-and-qc.md` §3.1 pass.
- [ ] If permissions or data collection changed: update
      `docs/google-play-console-manual.md` §3.4 **and** the Data Safety form
      in Play Console **before** tagging.

---

## 4. Promotion gates (track → track)

Manual; enforce by checklist before triggering the Promote workflow.

### internal → alpha
- [ ] ≥ 3 days on internal with ≥ 5 testers
- [ ] Crash-free sessions ≥ 99.5%
- [ ] No P0/P1 in QC matrix

### alpha → beta
- [ ] ≥ 14 days on alpha with ≥ 12 active testers
- [ ] Pre-launch report green on all virtual devices
- [ ] Android Auto checks pass (if Auto surfaces touched)

### beta → production (10% staged)
- [ ] ≥ 7 days beta crash-free ≥ 99.7%
- [ ] Privacy owner signed the data-safety mapping for this release
- [ ] Bilingual release notes finalised
- [ ] Rollback target `versionCode` documented in the release report

---

## 5. Promoting between tracks (no rebuild)

Don't re-tag to promote. **Re-routing the same artifact** is what Play
expects, and it preserves the version lineage.

1. Go to **Actions → Promote Android release → Run workflow**.
2. Pick:
   - `from_track` (where the draft lives now)
   - `to_track` (alpha / beta / production)
   - `version_code` (the code you want to promote)
   - `rollout_percent` (10 for first production push, 100 for full)
   - `release_status` (`inProgress` for staged, `completed` for full)
3. GitHub prompts a reviewer in the `play-promotion` environment to approve.
4. Approver reviews the target track + rollout %, then clicks **Approve**.
5. Workflow promotes via Play Developer API in <1 min.
6. **Manually append** a row to the promotion log inside
   `docs/releases/<tag>.md` so the artifact's lineage stays auditable.

> **First-time setup** (one-off): repo → Settings → Environments → New
> environment → name it `play-promotion` → check **Required reviewers** →
> add the people allowed to push to alpha/beta/production.

---

## 6. Required GitHub secrets

| Secret                       | Purpose                                  | Required |
|------------------------------|------------------------------------------|----------|
| `RUFAYQ_KEYSTORE_B64`        | Upload keystore (base64, no newlines)    | yes      |
| `RUFAYQ_STORE_PASS`          | Keystore password                        | yes      |
| `RUFAYQ_KEY_PASS`            | Key alias password                       | yes      |
| `RUFAYQ_KEY_ALIAS`           | Key alias (default: `rufayq`)            | optional |
| `PLAY_SERVICE_ACCOUNT_JSON`  | Full JSON of Play publisher service acct | yes      |
| `PLAY_PACKAGE_NAME`          | `com.rufayq.app`                         | yes      |
| `PLAY_UPLOAD_CERT_SHA256`    | Expected upload-cert fingerprint (§7)    | recommended |
| `VITE_SUPABASE_URL`          | Build-time backend URL                   | yes      |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Build-time backend anon key           | yes      |
| `VITE_SUPABASE_PROJECT_ID`   | Build-time backend project id            | yes      |

If any required secret is missing or malformed, the **preflight** job aborts
with a labelled `::error::` line (no minutes burned).

---

## 7. Play App Signing — upload key vs. signing key

Short version: with App Signing enabled (the default), there are **two**
certificates in play. CI must validate against the right one.

See `docs/play-app-signing.md` for the deep dive. TL;DR:

- The keystore in `RUFAYQ_KEYSTORE_B64` is the **upload key**. CI uses it to
  sign the AAB before upload.
- Google then re-signs with the **app signing key** for end-user devices.
- To prevent "wrong keystore in CI" disasters, set `PLAY_UPLOAD_CERT_SHA256`
  to the SHA-256 of the upload cert as shown in **Play Console → Setup →
  App integrity → Upload key certificate**. The workflow refuses to bundle
  if the local cert doesn't match.

---

## 8. Per-release reports

Every successful build writes:

```
docs/releases/<tag>.md
docs/releases/<tag>.html
```

The report contains: versionCode/versionName, AAB sha256, signing cert
fingerprints, declared permissions, the data-safety/permissions checklist,
and a promotion log table. It is also attached to the GitHub Release for
auditors who don't have repo access.

---

## 9. When something goes wrong

| Symptom | Likely cause | Fix |
|---|---|---|
| Preflight: "missing required secrets" | Secret not set | Settings → Secrets → add it, rerun |
| Preflight: "PLAY_SERVICE_ACCOUNT_JSON malformed" | Pasted with smart quotes / truncated | Re-paste raw JSON |
| Validate: "alias 'X' not found" | Wrong `RUFAYQ_KEY_ALIAS` | Set the correct alias secret |
| Validate: "cert SHA-256 does not match" | Wrong keystore in secret | Re-encode the right keystore |
| Upload: "Version code N has already been used" | Forgot to bump versionCode | Bump, retag with a new patch |
| Upload: 403 from Play API | Service account not granted release perms | Grant in Play Console → Users |
| Upload: "Track 'production' requires staged rollout" | Promotion went to production without `userFraction` | Use Promote workflow, not direct upload |
