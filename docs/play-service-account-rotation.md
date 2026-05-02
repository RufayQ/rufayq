# Rotating & Revoking the Play Console Service Account

The `PLAY_SERVICE_ACCOUNT_JSON` secret in GitHub Actions is what lets CI
upload AABs to Google Play. Treat it like a production database password:
rotate on a schedule, revoke immediately on any suspicion of leak.

> Service account email: `rufayq-play-publisher@<gcp-project>.iam.gserviceaccount.com`
> GitHub secret name:    `PLAY_SERVICE_ACCOUNT_JSON`
> Default upload track:  `internal` (status `draft` — never auto-promoted)

---

## 1. When to rotate

| Trigger | Action | SLA |
|---|---|---|
| Routine | Rotate | every 90 days |
| Engineer with access leaves | Rotate + audit Play Console roles | same day |
| Key file pasted in chat / committed / shared | **Revoke first**, then rotate | within 1 hour |
| GitHub repo made public | Revoke + rotate + audit `git log` | within 1 hour |
| Suspicious upload appears in Play Console | Revoke, rotate, contact Google support | immediately |

---

## 2. Rotate (no downtime)

Google Cloud allows up to **10 active keys** per service account. Always
add the new key first, deploy, then delete the old one — never the reverse.

### 2.1 Create new key
1. Google Cloud Console → IAM & Admin → **Service Accounts**
2. Open `rufayq-play-publisher`
3. **Keys** tab → **Add key → Create new key → JSON** → download
4. Rename file to `play-sa-YYYY-MM-DD.json` and store in 1Password (or your secret vault)

### 2.2 Update GitHub secret
1. GitHub repo → Settings → Secrets and variables → Actions
2. Find `PLAY_SERVICE_ACCOUNT_JSON` → **Update**
3. Paste the **entire JSON** (including the leading `{` and trailing `}`)
4. Save

### 2.3 Verify
1. Push a no-op tag: `git tag v0.0.0-rotate-test && git push --tags`
2. Watch the **Android release** workflow — the "Upload to Play Console" step should succeed
3. Confirm a draft release appears in Play Console → Internal testing
4. Delete the test draft + delete the test tag

### 2.4 Delete old key
1. Cloud Console → Service Accounts → `rufayq-play-publisher` → **Keys**
2. Identify the old key by its **Key ID** (visible on both the JSON file and the console row)
3. Click the trash icon → confirm
4. Wait 5 minutes, run another tag push to confirm CI still works

---

## 3. Emergency revoke (suspected leak)

**Do this first — before rotation, before notifying the team.**

1. Cloud Console → IAM & Admin → Service Accounts → `rufayq-play-publisher`
2. **Keys** tab → delete **all** keys (every row, including ones you think are safe)
3. Cloud Console → IAM → find the service account → **Edit (pencil) → Remove all roles**
   *(this neutralises the account even if a key copy survives)*
4. Play Console → Users & permissions → search the service account email →
   **Remove access**
5. Note the time + suspected vector in `docs/incident-log.md`
6. Then proceed with §2 to issue a fresh key

If the leaked key may have been used:
- Play Console → Release dashboard → review the last 30 days of uploads
- Look for unfamiliar version codes or release notes
- If anything is suspicious, contact Google Play Developer Support and
  open a security ticket; do not promote any pending release until cleared

---

## 4. Permanent revoke (offboarding the integration)

If you decide to stop CI uploads entirely:

1. Delete every key under the service account (see §3 step 2)
2. Play Console → Users & permissions → remove the service account
3. GitHub → repo Settings → Secrets → delete:
   - `PLAY_SERVICE_ACCOUNT_JSON`
   - `PLAY_PACKAGE_NAME`
   - `PLAY_TRACK`
4. Cloud Console → delete the service account itself
5. Update `docs/google-play-console-manual.md` to note manual uploads are now in effect

The CI upload step in `.github/workflows/release-android.yml` is guarded
by `if: secrets.PLAY_SERVICE_ACCOUNT_JSON != ''`, so removing the secret
silently disables the upload without breaking the AAB build or the
GitHub Release attachment.

---

## 5. Hygiene rules

- **Never** paste service-account JSON in chat, email, Lovable prompts, Slack, or git commits
- **Never** download a key onto a personal laptop — use a managed device
- **Never** create a key with project-level `Owner` / `Editor` roles. The only role this account needs is **Service Account User** at the project level (so CI can authenticate) plus the per-app role granted inside Play Console
- The Play Console role for this account should be **Release manager** scoped to the Rufayq app only — not Admin, not account-wide
- Keep the **GitHub repo private** while CI has Play upload powers. If you ever need to open-source it, revoke first (§3), then rotate after the repo is public
- Record every rotation in `docs/incident-log.md` with date + key ID + actor
