/**
 * Tests for the `chat` edge function — verifies credit gating, 429 responses,
 * counter atomicity, and per-plan tier limits.
 *
 * Run via the supabase--test_edge_functions tool. Each test seeds a unique
 * device_id + plan in `user_trials`, calls the deployed function over HTTP,
 * and asserts the credit-counter behavior.
 *
 * The tests intentionally do NOT assert on the AI response body (the function
 * proxies a streaming AI gateway). They only verify the credit-gating layer
 * which is the contract we own.
 */
import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL") ?? Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const FN_URL = `${SUPABASE_URL}/functions/v1/chat`;

const admin = createClient(SUPABASE_URL, SERVICE_KEY);

const newDeviceId = (label = "test") =>
  `${label}-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;

async function seedTrial(deviceId: string, plan: string) {
  await admin.from("user_trials").upsert({
    device_id: deviceId,
    plan,
    trial_started_at: new Date().toISOString(),
    trial_ends_at: new Date(Date.now() + 86400_000 * 30).toISOString(),
  }, { onConflict: "device_id" });
}

async function cleanup(deviceId: string) {
  await admin.from("ai_usage").delete().eq("device_id", deviceId);
  await admin.from("user_trials").delete().eq("device_id", deviceId);
}

async function callChat(deviceId: string) {
  // Minimal payload that passes guards; we abort the response stream quickly.
  const res = await fetch(FN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${ANON_KEY}`,
      "apikey": ANON_KEY,
      "x-device-id": deviceId,
    },
    body: JSON.stringify({ messages: [{ role: "user", content: "hi" }] }),
  });
  // Drain or read JSON body
  const ct = res.headers.get("content-type") || "";
  let body: any = null;
  if (ct.includes("application/json")) {
    body = await res.json().catch(() => null);
  } else {
    // streaming success — drain & discard
    await res.body?.cancel();
  }
  return { status: res.status, body };
}

async function getUsage(deviceId: string) {
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await admin.from("ai_usage").select("count")
    .eq("device_id", deviceId).eq("usage_day", today).maybeSingle();
  return data?.count ?? 0;
}

// === Tests ===

Deno.test("rejects request with no x-device-id", async () => {
  const res = await fetch(FN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${ANON_KEY}`, "apikey": ANON_KEY },
    body: JSON.stringify({ messages: [{ role: "user", content: "hi" }] }),
  });
  await res.text();
  assertEquals(res.status, 401);
});

Deno.test("rejects unknown device (no trial row)", async () => {
  const dev = newDeviceId("unknown");
  const r = await callChat(dev);
  assertEquals(r.status, 403);
  await cleanup(dev);
});

Deno.test("trial plan: allows first prompt, blocks 6th with 429", async () => {
  const dev = newDeviceId("trial");
  await seedTrial(dev, "trial");
  try {
    const results: number[] = [];
    for (let i = 0; i < 6; i++) {
      const r = await callChat(dev);
      results.push(r.status);
    }
    // First 5 should succeed (200) — final one is 429
    const success = results.filter(s => s === 200).length;
    const blocked = results.filter(s => s === 429).length;
    assert(success >= 1, `expected at least 1 success, got ${results.join(",")}`);
    assertEquals(blocked, 1, `expected exactly 1 x 429, got ${results.join(",")}`);
    const used = await getUsage(dev);
    assertEquals(used, 5, "counter should cap at limit (5)");
  } finally {
    await cleanup(dev);
  }
});

Deno.test("basic plan: 25 daily limit enforced", async () => {
  const dev = newDeviceId("basic");
  await seedTrial(dev, "basic");
  try {
    // Fast-forward by setting count = 24 directly, then 1 success + 1 block.
    const today = new Date().toISOString().slice(0, 10);
    await admin.from("ai_usage").upsert({
      device_id: dev, usage_day: today, count: 24, last_prompt_at: new Date().toISOString(),
    }, { onConflict: "device_id,usage_day" });
    const a = await callChat(dev);
    const b = await callChat(dev);
    assertEquals(a.status, 200);
    assertEquals(b.status, 429);
    assertEquals(b.body?.limit, 25);
    assertEquals(b.body?.plan, "basic");
  } finally {
    await cleanup(dev);
  }
});

Deno.test("429 body includes resets_at and used count", async () => {
  const dev = newDeviceId("body");
  await seedTrial(dev, "trial");
  const today = new Date().toISOString().slice(0, 10);
  await admin.from("ai_usage").upsert({
    device_id: dev, usage_day: today, count: 5, last_prompt_at: new Date().toISOString(),
  }, { onConflict: "device_id,usage_day" });
  try {
    const r = await callChat(dev);
    assertEquals(r.status, 429);
    assert(r.body?.resets_at, "resets_at should be set");
    assertEquals(r.body?.used, 5);
  } finally {
    await cleanup(dev);
  }
});

Deno.test("race condition: 10 parallel requests at limit-1 only let one through", async () => {
  const dev = newDeviceId("race");
  await seedTrial(dev, "trial");
  try {
    const today = new Date().toISOString().slice(0, 10);
    // Pre-seed count = 4 → only 1 of 10 parallel calls should succeed (limit=5)
    await admin.from("ai_usage").upsert({
      device_id: dev, usage_day: today, count: 4, last_prompt_at: new Date().toISOString(),
    }, { onConflict: "device_id,usage_day" });

    const results = await Promise.all(Array.from({ length: 10 }, () => callChat(dev)));
    const ok = results.filter(r => r.status === 200).length;
    const blocked = results.filter(r => r.status === 429).length;
    assertEquals(ok, 1, `parallel: expected exactly 1 success, got ${ok} (statuses: ${results.map(r=>r.status).join(",")})`);
    assertEquals(blocked, 9, `parallel: expected 9 x 429, got ${blocked}`);
    const used = await getUsage(dev);
    assertEquals(used, 5, "atomic counter should land exactly on limit");
  } finally {
    await cleanup(dev);
  }
});

Deno.test("rejects empty messages array", async () => {
  const dev = newDeviceId("empty");
  await seedTrial(dev, "trial");
  try {
    const res = await fetch(FN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${ANON_KEY}`, "apikey": ANON_KEY, "x-device-id": dev },
      body: JSON.stringify({ messages: [] }),
    });
    const body = await res.json();
    assertEquals(res.status, 400);
    assert(body?.error);
  } finally {
    await cleanup(dev);
  }
});
