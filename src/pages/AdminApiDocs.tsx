/**
 * /admin/api-docs — In-app developer documentation for the `src/api` layer.
 *
 * Surfaces:
 *  • The pattern (contracts → clients → realtime).
 *  • Every exported contract with its fields.
 *  • Copy-paste examples for web and mobile (Capacitor / React Native) consumers.
 *
 * Lives under /admin so only signed-in operators see it; no SEO indexing.
 */
import { Link } from "react-router-dom";
import { ArrowLeft, BookOpen, Code, Radio, Shield } from "lucide-react";
import { listRealtimeChannels } from "@/api";

const Section = ({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) => (
  <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 space-y-3">
    <h2 className="flex items-center gap-2 text-base font-semibold text-slate-100">{icon}{title}</h2>
    <div className="text-sm text-slate-300 space-y-2">{children}</div>
  </section>
);

const Code2 = ({ children }: { children: string }) => (
  <pre className="rounded-lg border border-slate-800 bg-slate-950/70 p-3 overflow-x-auto text-xs text-amber-100 font-mono">{children}</pre>
);

const RESOURCES: { name: string; client: string; contract: string; ops: string[] }[] = [
  { name: "Subscriptions", client: "subscriptionsClient", contract: "SubscriptionSchema",  ops: ["getCurrent", "hasPendingReceipt"] },
  { name: "Payments",      client: "paymentsClient",      contract: "PaymentReceiptSchema", ops: ["list", "upload", "updateStatus", "pendingCount"] },
  { name: "CMS",           client: "cmsClient",           contract: "CmsPageSchema",        ops: ["listPages", "getPage", "listSections", "publish", "createPage", "deletePage"] },
  { name: "Tickets",       client: "ticketsClient",       contract: "SupportTicketSchema",  ops: ["list", "updateStatus", "openCount"] },
  { name: "Reviews",       client: "reviewsClient",       contract: "AppReviewSchema",      ops: ["list", "setApproved", "remove", "listApproved"] },
  { name: "RCM",           client: "rcmClient",           contract: "PatientClaimSchema",   ops: ["listPendingClaims", "pendingCount"] },
  { name: "Auth",          client: "authClient",          contract: "CurrentAuthSchema",    ops: ["current", "hasAnyRole", "canPerform", "signOut"] },
];

const AdminApiDocs = () => {
  const channels = listRealtimeChannels();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-6 max-w-5xl mx-auto">
      <Link to="/admin" className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 mb-4">
        <ArrowLeft size={14} /> Back to admin
      </Link>

      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-50 flex items-center gap-2">
          <BookOpen size={22} className="text-amber-400" /> RufayQ API
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Single contract surface for the web app, the admin portal, and the upcoming
          iOS / Android / Huawei / Android Auto mobile apps. Everything ships from
          <code className="mx-1 px-1.5 py-0.5 rounded bg-slate-800 text-amber-300 font-mono text-xs">@/api</code>.
        </p>
      </header>

      <div className="grid gap-4">
        <Section title="The pattern" icon={<Code size={16} className="text-amber-400" />}>
          <ol className="list-decimal list-inside space-y-1">
            <li><b>Contract</b> — Zod schema in <code className="font-mono text-amber-300">contracts/&lt;resource&gt;.ts</code>. Types are inferred so they can never drift.</li>
            <li><b>Client</b> — thin wrapper in <code className="font-mono text-amber-300">clients/&lt;resource&gt;.client.ts</code>. Always returns <code className="font-mono text-amber-300">{`{ data, error }`}</code> — never throws.</li>
            <li><b>Realtime</b> — channel registered in <code className="font-mono text-amber-300">realtime/channels.ts</code> and consumed via <code className="font-mono text-amber-300">useRealtimeChannel(key, cb)</code>.</li>
          </ol>
        </Section>

        <Section title="Resources" icon={<Code size={16} className="text-amber-400" />}>
          <div className="rounded-lg border border-slate-800 overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-slate-900/60 text-slate-400">
                <tr><th className="text-left p-2">Resource</th><th className="text-left p-2">Client</th><th className="text-left p-2">Contract</th><th className="text-left p-2">Operations</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {RESOURCES.map((r) => (
                  <tr key={r.name}>
                    <td className="p-2 font-semibold text-slate-100">{r.name}</td>
                    <td className="p-2 font-mono text-amber-300">{r.client}</td>
                    <td className="p-2 font-mono text-emerald-300">{r.contract}</td>
                    <td className="p-2 font-mono text-slate-400">{r.ops.join(", ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Section title="Web example — paginate + verify a receipt" icon={<Code size={16} className="text-amber-400" />}>
          <Code2>{`import { paymentsClient } from "@/api";

const { data, error } = await paymentsClient.list();
if (error) toast.error(error.message);

await paymentsClient.updateStatus(receiptId, {
  status: "verified",
  reviewer_notes: "Bank statement matches",
});`}</Code2>
        </Section>

        <Section title="Mobile example — Capacitor / React Native" icon={<Code size={16} className="text-amber-400" />}>
          <p>The mobile app depends on the <code className="font-mono text-amber-300">@rufayq/api</code> package (a thin re-export of <code className="font-mono text-amber-300">src/api</code>) and the same Supabase publishable key. No business logic lives in the app shell.</p>
          <Code2>{`import { subscriptionsClient, useRealtimeChannel } from "@rufayq/api";

const sub = await subscriptionsClient.getCurrent(deviceId);

// Listen for receipt verification in real time
useRealtimeChannel("paymentsPending", (evt) => {
  if (evt.new.status === "verified") refresh();
});`}</Code2>
        </Section>

        <Section title="Realtime channels" icon={<Radio size={16} className="text-amber-400" />}>
          <div className="rounded-lg border border-slate-800 overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-slate-900/60 text-slate-400">
                <tr><th className="text-left p-2">Channel</th><th className="text-left p-2">Table</th><th className="text-left p-2">Event</th><th className="text-left p-2">Filter</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {channels.map((c) => (
                  <tr key={c.name}>
                    <td className="p-2 font-mono text-amber-300">{c.name}</td>
                    <td className="p-2 font-mono text-slate-300">{c.table}</td>
                    <td className="p-2 text-slate-400">{c.event}</td>
                    <td className="p-2 font-mono text-emerald-300">{c.filter}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Section title="Auth & permissions" icon={<Shield size={16} className="text-amber-400" />}>
          <p>Use <code className="font-mono text-amber-300">authClient.canPerform(action)</code> for UI gating. RLS still enforces security server-side.</p>
          <Code2>{`import { authClient } from "@/api";

const { data: allowed } = await authClient.canPerform("payment.verify");
if (allowed) showVerifyButton();`}</Code2>
        </Section>

        <Section title="Error envelope" icon={<Code size={16} className="text-amber-400" />}>
          <p>Every client method returns <code className="font-mono text-amber-300">ApiResult&lt;T&gt;</code>:</p>
          <Code2>{`type ApiResult<T> = {
  data: T | null;
  error: { code: string; message: string } | null;
};

// Common error codes:
//   invalid_input         – Zod validation failed
//   query_failed          – DB read error
//   insert_failed         – DB insert error
//   update_failed         – DB update error
//   delete_failed         – DB delete error
//   contract_violation    – DB returned a row that doesn't match the schema
//   validation_failed     – Business-rule guard rejected the change`}</Code2>
        </Section>
      </div>
    </div>
  );
};

export default AdminApiDocs;
