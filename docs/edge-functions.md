# Edge functions

Deno functions in `supabase/functions/<name>/index.ts`. Auto-deployed on save.
Invoke from the client with:

```ts
const { data, error } = await supabase.functions.invoke('<name>', { body });
```

| Function | Purpose | Auth | Secrets |
|----------|---------|------|---------|
| `chat` | AI medical chat (Gemini via Lovable AI Gateway). Streams responses. | JWT | `LOVABLE_API_KEY` |
| `scan-receipt` | OCR for refund/payout receipts. Returns `{reference_no, amount, reason}`. | JWT (admin) | `LOVABLE_API_KEY` |
| `send-otp` | Sends sign-in OTP code (email/SMS). | public | OTP provider |
| `verify-otp` | Validates an OTP and issues session. | public | OTP provider |
| `admin-create-user` | Admin invites a team member with role. | JWT (admin) | service role |
| `admin-reset-password` | Admin-triggered password reset. | JWT (admin) | service role |
| `approve-provider` | Admin approves a provider account. | JWT (admin) | — |
| `provider-search-patient` | Provider lookup with consent check. | JWT (provider) | — |
| `rcm-bulk-parse` | Parses claim CSVs into `rcm_claims`. | JWT (provider) | — |
| `expire-pending-payments` | Sweeps stale pending payments. | service (cron) | — |

## Conventions

- Always validate the JWT via `supabase.auth.getUser()` unless the function is
  explicitly public (`verify_jwt = false` in `supabase/config.toml`).
- Never log secrets or full request bodies in production.
- Return `{ data, error }`-shaped JSON for client parity.
- For long-running AI calls, stream with SSE and let the client render
  progressively (see `chat`).

## Lovable AI usage

Use the gateway, not raw API keys:

```ts
const r = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'google/gemini-2.5-flash',
    messages: [...]
  }),
});
```

Preferred models:
- `google/gemini-2.5-flash` — default chat & vision (cheap, fast).
- `google/gemini-2.5-pro` — heavy reasoning / long context only.
