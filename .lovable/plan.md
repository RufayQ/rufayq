# Use your own Google OAuth credentials (BYOK)

Good news: this is a **configuration-only** change. No code in the app has to change — `lovable.auth.signInWithOAuth("google", ...)` keeps working exactly the same; it just starts using your client ID/secret instead of Lovable's shared ones.

## What you'll need from Google Cloud Console

1. A project in [Google Cloud Console](https://console.cloud.google.com/).
2. **OAuth consent screen** configured:
   - User type: External (or Internal if Workspace-only).
   - Add your domains under **Authorized domains**:
     - `lovable.app`
     - `rufayq.com` (your custom domain)
   - Scopes: `openid`, `.../auth/userinfo.email`, `.../auth/userinfo.profile`.
   - Add your branding (app name, logo, support email) — this is what users will see on the Google consent screen instead of Lovable's.
3. **Credentials → Create credentials → OAuth client ID**
   - Application type: **Web application**.
   - Authorized redirect URI: the **callback URL** shown in Lovable Cloud → Users → Authentication Settings → Google (we'll grab it in step 1 below).
4. After creation, copy the **Client ID** and **Client Secret**.

## Steps in Lovable

1. Open **Cloud → Users → Authentication Settings → Sign‑in methods → Google**, expand the Google provider, and copy the **Callback URL** shown there.
2. Paste that callback URL into your Google OAuth client's **Authorized redirect URIs** and save in Google Cloud.
3. Back in the same Lovable Google provider panel, switch from **Managed credentials** to **Custom credentials** and paste your **Client ID** and **Client Secret**, then save.
4. Test: sign out, click **Continue with Google**, confirm the consent screen now shows **your** app name and logo instead of Lovable's.

## Notes

- Custom domain (`rufayq.com`) keeps working — OAuth still flows through Lovable's `/~oauth/...` proxy, which honors custom domains.
- No `.env`, no edge function changes, no code edits in this repo.
- If you want SAML SSO later (Okta / Entra / Workspace SAML for company employees), that's a separate flow and I can wire it via `configure_saml_sso`.

```text
Browser  ─►  rufayq.com /~oauth/initiate
         ─►  Lovable OAuth broker
         ─►  Google consent (YOUR client_id, YOUR branding)
         ─►  Lovable callback
         ─►  Session set in app
```

<presentation-actions>
<presentation-open-backend>Open Authentication Settings</presentation-open-backend>
</presentation-actions>
