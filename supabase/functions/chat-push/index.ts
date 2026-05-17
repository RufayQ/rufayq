// chat-push — fan out a single chat_messages row to FCM HTTP v1.
//
// Invoked by the AFTER INSERT trigger `trg_chat_message_dispatch_push` via pg_net
// with body `{ message_id }`. Performs E2E:
//   1. Load message + thread.
//   2. Find recipient participants (everyone in the thread except the sender).
//   3. Suppress recipients whose `last_read_at >= message.created_at`
//      (already read on some device, e.g. via realtime in the foreground).
//   4. Resolve their FCM tokens from device_push_tokens (matched by device_id
//      first, falling back to user_id when device_id isn't set on the token).
//   5. Mint a Google OAuth access token from FCM_SERVICE_ACCOUNT_JSON and POST
//      to fcm.googleapis.com/v1/projects/<id>/messages:send for each token.
//   6. Best-effort prune: 404/UNREGISTERED tokens are deleted.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { SignJWT, importPKCS8 } from "https://deno.land/x/jose@v5.6.3/index.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type ServiceAccount = {
  client_email: string;
  private_key: string;
  project_id: string;
  token_uri: string;
};

let cachedToken: { value: string; exp: number } | null = null;

async function getAccessToken(sa: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.exp - 60 > now) return cachedToken.value;

  const pk = await importPKCS8(sa.private_key, "RS256");
  const jwt = await new SignJWT({
    scope: "https://www.googleapis.com/auth/firebase.messaging",
  })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuer(sa.client_email)
    .setSubject(sa.client_email)
    .setAudience(sa.token_uri)
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(pk);

  const res = await fetch(sa.token_uri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  if (!res.ok) throw new Error(`oauth ${res.status}: ${await res.text()}`);
  const json = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = { value: json.access_token, exp: now + json.expires_in };
  return json.access_token;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let body: { message_id?: string };
  try { body = await req.json(); } catch { body = {}; }
  const messageId = body.message_id;
  if (!messageId) {
    return new Response(JSON.stringify({ error: "message_id required" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // 1. Message + thread
  const { data: msg, error: msgErr } = await supabase
    .from("chat_messages")
    .select("id, thread_id, sender_device_id, sender_user_id, sender_org_id, body, created_at, deleted_at")
    .eq("id", messageId)
    .maybeSingle();
  if (msgErr || !msg || msg.deleted_at) {
    return new Response(JSON.stringify({ skipped: "missing-or-deleted" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: thread } = await supabase
    .from("chat_threads")
    .select("id, kind, title")
    .eq("id", msg.thread_id)
    .maybeSingle();

  // 2. Recipient participants (everyone except the sender device/org).
  const { data: parts } = await supabase
    .from("chat_participants")
    .select("device_id, organization_id, display_name, last_read_at")
    .eq("thread_id", msg.thread_id);
  const recipients = (parts ?? []).filter((p) => {
    if (msg.sender_device_id && p.device_id === msg.sender_device_id) return false;
    if (msg.sender_org_id && p.organization_id === msg.sender_org_id) return false;
    // 3. Suppression: already read up to or past this message
    if (p.last_read_at && new Date(p.last_read_at) >= new Date(msg.created_at)) return false;
    return true;
  });

  if (recipients.length === 0) {
    return new Response(JSON.stringify({ delivered: 0, reason: "no-recipients" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Sender display name
  let senderName = "New message";
  if (msg.sender_device_id) {
    const { data: senderRow } = await supabase
      .from("chat_participants")
      .select("display_name")
      .eq("thread_id", msg.thread_id)
      .eq("device_id", msg.sender_device_id)
      .maybeSingle();
    senderName = senderRow?.display_name ?? senderName;
  }

  // 4. Resolve FCM tokens for recipients (device-keyed; only device participants are pushable today).
  const deviceIds = recipients.map((r) => r.device_id).filter((d): d is string => !!d);
  if (deviceIds.length === 0) {
    return new Response(JSON.stringify({ delivered: 0, reason: "no-device-recipients" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: tokens } = await supabase
    .from("device_push_tokens")
    .select("token, platform, device_id")
    .in("device_id", deviceIds);

  if (!tokens || tokens.length === 0) {
    return new Response(JSON.stringify({ delivered: 0, reason: "no-tokens" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // 5. FCM send
  const saRaw = Deno.env.get("FCM_SERVICE_ACCOUNT_JSON");
  if (!saRaw) {
    return new Response(JSON.stringify({ error: "FCM_SERVICE_ACCOUNT_JSON missing" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  let sa: ServiceAccount;
  try { sa = JSON.parse(saRaw); } catch {
    return new Response(JSON.stringify({ error: "FCM_SERVICE_ACCOUNT_JSON invalid JSON" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const accessToken = await getAccessToken(sa);
  const sendUrl = `https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`;

  const title = thread?.kind === "ai" ? "RufayQ" : senderName;
  const preview = (msg.body ?? "").slice(0, 140);

  let delivered = 0;
  const stale: string[] = [];

  await Promise.all(tokens.map(async (t) => {
    const payload = {
      message: {
        token: t.token,
        notification: { title, body: preview },
        data: {
          url: `/chat/${msg.thread_id}`,
          thread_id: msg.thread_id,
          message_id: msg.id,
        },
        android: {
          priority: "HIGH",
          collapse_key: msg.thread_id,
          notification: { tag: msg.thread_id, channel_id: "chat" },
        },
        apns: {
          headers: { "apns-collapse-id": msg.thread_id, "apns-priority": "10" },
          payload: { aps: { sound: "default", "thread-id": msg.thread_id } },
        },
      },
    };
    const r = await fetch(sendUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    if (r.ok) { delivered += 1; return; }
    const errBody = await r.text();
    if (r.status === 404 || /UNREGISTERED|INVALID_ARGUMENT/i.test(errBody)) {
      stale.push(t.token);
    } else {
      console.warn("[chat-push] fcm send failed", r.status, errBody);
    }
  }));

  if (stale.length > 0) {
    await supabase.from("device_push_tokens").delete().in("token", stale);
  }

  return new Response(
    JSON.stringify({ delivered, tokens: tokens.length, pruned: stale.length }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
