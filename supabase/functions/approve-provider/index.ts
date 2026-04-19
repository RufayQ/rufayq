import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function j(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

function genPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let p = "";
  const buf = new Uint8Array(14);
  crypto.getRandomValues(buf);
  for (const b of buf) p += chars[b % chars.length];
  return p + "!9";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization") || "";
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(url, anon, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return j({ error: "Unauthorized" }, 401);

    const admin = createClient(url, service);
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) return j({ error: "Forbidden" }, 403);

    const { application_id, admin_feedback } = await req.json();
    if (!application_id) return j({ error: "application_id required" }, 400);

    // 1. Fetch the application
    const { data: app, error: appErr } = await admin
      .from("provider_applications")
      .select("*")
      .eq("id", application_id)
      .single();
    if (appErr || !app) return j({ error: appErr?.message || "Application not found" }, 404);

    // 2. Create or reuse organization
    let organization_id = app.organization_id as string | null;
    if (!organization_id) {
      const { data: org, error: orgErr } = await admin
        .from("organizations")
        .insert({
          name: app.org_name,
          org_type: app.org_type,
          country: app.country,
          contact_email: app.contact_email,
          contact_phone: app.contact_phone,
          website: app.website,
          notes: app.notes,
          created_by: user.id,
        })
        .select("id")
        .single();
      if (orgErr) return j({ error: `org create failed: ${orgErr.message}` }, 400);
      organization_id = org.id;
    }

    // 3. Create or reuse provider auth user
    const tempPassword = genPassword();
    let providerUserId: string | null = null;
    let userExisted = false;

    const { data: created, error: cErr } = await admin.auth.admin.createUser({
      email: app.contact_email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name: app.contact_person_name, phone: app.contact_phone, organization_id, created_by_admin: true },
    });

    if (cErr) {
      // If user already exists, look them up and reset their password
      const { data: list } = await admin.auth.admin.listUsers();
      const existing = list?.users?.find((u) => u.email?.toLowerCase() === app.contact_email.toLowerCase());
      if (existing) {
        providerUserId = existing.id;
        userExisted = true;
        await admin.auth.admin.updateUserById(existing.id, { password: tempPassword, email_confirm: true });
      } else {
        return j({ error: `auth create failed: ${cErr.message}` }, 400);
      }
    } else {
      providerUserId = created.user!.id;
    }

    // 4. Insert profile (best-effort)
    if (!userExisted) {
      await admin.from("profiles").insert({
        device_id: `provider_${providerUserId!.slice(0, 12)}`,
        full_name_en: app.contact_person_name,
        email: app.contact_email,
        phone: app.contact_phone,
        organization_id,
        provider_type: ["hospital", "vendor", "insurance"].includes(app.org_type) ? app.org_type : "physician",
      });
    }

    // 5. Insert provider_members link (idempotent via composite check)
    const { data: existingMember } = await admin
      .from("provider_members")
      .select("id")
      .eq("user_id", providerUserId!)
      .eq("organization_id", organization_id!)
      .maybeSingle();
    if (!existingMember) {
      await admin.from("provider_members").insert({
        user_id: providerUserId!,
        organization_id: organization_id!,
        member_role: "owner",
        is_active: true,
      });
    }

    // 6. Update application
    await admin
      .from("provider_applications")
      .update({
        status: "approved",
        admin_feedback: admin_feedback?.trim() || null,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        organization_id,
      })
      .eq("id", application_id);

    // 7. Audit
    await admin.rpc("log_audit_event", {
      _action: "provider_application_approved_oneclick",
      _target_type: "provider_application",
      _target_id: application_id,
      _details: { organization_id, provider_user_id: providerUserId, user_existed: userExisted },
      _actor_id: user.id,
      _actor_email: user.email,
    });

    // 8. Best-effort transactional email via send-transactional-email if available
    let emailSent = false;
    try {
      const origin = req.headers.get("origin") || "";
      const loginUrl = `${origin || "https://rufayq.com"}/provider/login`;
      const html = `
        <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0F172A">
          <h2 style="color:#0F766E;margin:0 0 12px">Welcome to RufayQ for Providers</h2>
          <p>Hello ${app.contact_person_name},</p>
          <p>Your provider application for <strong>${app.org_name}</strong> has been <strong style="color:#10B981">approved</strong>.</p>
          ${admin_feedback ? `<blockquote style="border-left:3px solid #C5965A;padding:8px 12px;background:#FAF7F2;color:#475569;margin:16px 0">${admin_feedback}</blockquote>` : ""}
          <p>You can now sign in to your provider portal:</p>
          <p style="background:#F1F5F9;padding:12px;border-radius:8px;font-family:monospace;font-size:13px">
            <strong>Email:</strong> ${app.contact_email}<br/>
            <strong>Temporary password:</strong> ${tempPassword}
          </p>
          <p><a href="${loginUrl}" style="display:inline-block;padding:10px 20px;background:#0F766E;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">Sign in to Provider Portal</a></p>
          <p style="color:#64748B;font-size:12px;margin-top:24px">Please change your password after first sign-in.<br/>— RufayQ Team</p>
        </div>`;
      const r = await admin.functions.invoke("send-transactional-email", {
        body: {
          to: app.contact_email,
          subject: `RufayQ Provider Portal — ${app.org_name} approved`,
          html,
          purpose: "transactional",
          idempotency_key: `provider_approve_${application_id}`,
        },
      });
      if (!r.error) emailSent = true;
    } catch (_e) { /* email infra not set up yet — ignore */ }

    return j({
      ok: true,
      organization_id,
      provider_user_id: providerUserId,
      user_existed: userExisted,
      temp_password: tempPassword,
      email_sent: emailSent,
    });
  } catch (e: any) {
    return j({ error: e.message || "Internal error" }, 500);
  }
});
