import { useRef, useState } from "react";
import { Upload, FileText, CheckCircle2, AlertTriangle, Bug } from "lucide-react";
import { toast } from "sonner";
import {
  PLATFORMS, type QcPlatform, qc,
} from "./lib/qcShared";
import { parseSmokeReport, suggestedSeverityForCase, type ParsedSmokeReport } from "./lib/parseSmokeReport";

const AdminQcSmoke = () => {
  const [parsed, setParsed] = useState<ParsedSmokeReport | null>(null);
  const [rawMd, setRawMd] = useState<string>("");
  const [build, setBuild] = useState("");
  const [platform, setPlatform] = useState<QcPlatform>("android");
  const [device, setDevice] = useState("");
  const [scenario, setScenario] = useState("Cold launch, online");
  const [notes, setNotes] = useState("");
  const [savedRunId, setSavedRunId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [creatingBug, setCreatingBug] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (f: File) => {
    const text = await f.text();
    const p = parseSmokeReport(text);
    setParsed(p);
    setRawMd(text);
    if (p.device && !device) setDevice(p.device);
    setSavedRunId(null);
  };

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    await handleFile(f);
  };

  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0]; if (!f) return;
    await handleFile(f);
  };

  const save = async () => {
    if (!parsed) { toast.error("Upload a smoke-report.md first"); return; }
    if (!build.trim()) { toast.error("Build version is required"); return; }
    setSaving(true);
    const payload: any = {
      build_version: build.trim(),
      platform,
      device: device.trim() || parsed.device || null,
      scenario,
      result: parsed.verdict === "pass" ? "pass" : parsed.verdict === "fail" ? "fail" : "blocked",
      case_code: parsed.caseCode,
      case_subtags: parsed.caseSubtags,
      notes: notes.trim() || null,
      smoke_report: rawMd,
      logcat_excerpt: parsed.logcatExcerpt,
    };
    const { data, error } = await qc("qc_test_runs").insert(payload).select("id").single();
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    setSavedRunId((data as any).id);
    toast.success("Smoke report saved");
  };

  const createBugFromRun = async () => {
    if (!parsed || !savedRunId) return;
    setCreatingBug(true);
    const caseTag = parsed.caseCode ? `Case ${parsed.caseCode}` : "FAIL";
    const subSuffix = parsed.caseSubtags.length ? ` [+${parsed.caseSubtags.join(", +")}]` : "";
    const title = `Startup ${caseTag}: ${parsed.caseLabel ?? "unknown"}${subSuffix}`;
    const description = [
      `**Source:** Android smoke report`,
      `**Build:** ${build || "?"}`,
      `**Platform:** ${platform}`,
      `**Device:** ${device || parsed.device || "?"}`,
      `**Verdict:** ${parsed.verdict.toUpperCase()}${parsed.caseCode ? ` — Case ${parsed.caseCode}` : ""}`,
      `**Sub-tags:** ${parsed.caseSubtags.join(", ") || "none"}`,
      ``,
      `## Startup checklist`,
      ...Object.entries(parsed.startupChecklist).map(([k, v]) => `- ${k}: ${v}`),
      ``,
      `## Push / FCM checklist`,
      ...Object.entries(parsed.pushChecklist).map(([k, v]) => `- ${k}: ${v}`),
      ``,
      `## Logcat excerpt (first 50 lines)`,
      "```log",
      (parsed.logcatExcerpt ?? "").split("\n").slice(0, 50).join("\n"),
      "```",
    ].join("\n");

    const payload: any = {
      title,
      description,
      source: "smoke_report",
      severity: suggestedSeverityForCase(parsed.caseCode),
      status: "open",
      platform,
      build_version: build || null,
      case_code: parsed.caseCode,
      case_subtags: parsed.caseSubtags,
      test_run_id: savedRunId,
    };
    const { error } = await qc("qc_bugs").insert(payload);
    setCreatingBug(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Bug created from smoke run");
  };

  const reset = () => {
    setParsed(null); setRawMd(""); setSavedRunId(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/40 p-6 text-center"
        onDragOver={(e) => e.preventDefault()} onDrop={onDrop}>
        <Upload size={28} className="mx-auto text-slate-500 mb-2" />
        <p className="text-sm text-slate-300">Drop <span className="font-mono text-amber-400">smoke-report.md</span> here, or</p>
        <button onClick={() => fileRef.current?.click()}
          className="mt-3 px-4 py-2 rounded-lg bg-amber-500 text-slate-950 text-xs font-semibold">
          Choose file
        </button>
        <input ref={fileRef} type="file" accept=".md,.markdown,text/markdown,text/plain" className="hidden" onChange={onPick} />
        <p className="text-[10px] text-slate-500 mt-2">
          Generated by <span className="font-mono">scripts/qa/android-smoke-report.sh</span>
        </p>
      </div>

      {parsed && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-4">
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              parsed.verdict === "pass" ? "bg-emerald-500/15 text-emerald-300" :
              parsed.verdict === "fail" ? "bg-red-500/15 text-red-300" :
              "bg-slate-800 text-slate-400"
            }`}>
              {parsed.verdict === "pass" ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-100">
                Verdict: {parsed.verdict.toUpperCase()}
                {parsed.caseCode && <span className="ml-2 text-amber-400">Case {parsed.caseCode}</span>}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">{parsed.caseLabel ?? "—"}</p>
              {parsed.caseSubtags.length > 0 && (
                <div className="flex gap-1 flex-wrap mt-1.5">
                  {parsed.caseSubtags.map((t) => (
                    <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">+{t}</span>
                  ))}
                </div>
              )}
              <p className="text-[10px] text-slate-500 mt-2">
                Device: {parsed.device ?? "?"} · Package: {parsed.packageName ?? "?"} · Logcat: {parsed.logcatExcerpt ? `${parsed.logcatExcerpt.split("\n").length} lines` : "none"}
              </p>
            </div>
            <button onClick={reset} className="text-xs text-slate-500 hover:text-slate-300">Clear</button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="text-xs text-slate-400 space-y-1">
              <span>Build version *</span>
              <input value={build} onChange={(e) => setBuild(e.target.value)} placeholder="1.4.2 (build 87)"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200" />
            </label>
            <label className="text-xs text-slate-400 space-y-1">
              <span>Platform</span>
              <select value={platform} onChange={(e) => setPlatform(e.target.value as QcPlatform)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200">
                {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </label>
            <label className="text-xs text-slate-400 space-y-1">
              <span>Device</span>
              <input value={device} onChange={(e) => setDevice(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200" />
            </label>
            <label className="text-xs text-slate-400 space-y-1">
              <span>Scenario</span>
              <input value={scenario} onChange={(e) => setScenario(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200" />
            </label>
            <label className="text-xs text-slate-400 space-y-1 md:col-span-2">
              <span>Notes</span>
              <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200" />
            </label>
          </div>

          <div className="flex flex-wrap gap-2 justify-end">
            <button disabled={!!savedRunId || saving} onClick={save}
              className="px-4 py-2 rounded-lg bg-amber-500 text-slate-950 text-xs font-semibold disabled:opacity-50 flex items-center gap-1.5">
              <FileText size={12} />{saving ? "Saving…" : savedRunId ? "Saved" : "Save run"}
            </button>
            <button disabled={!savedRunId || creatingBug || parsed.verdict !== "fail"} onClick={createBugFromRun}
              className="px-4 py-2 rounded-lg bg-red-500/20 border border-red-500/40 text-red-200 text-xs font-semibold disabled:opacity-40 flex items-center gap-1.5">
              <Bug size={12} />{creatingBug ? "Creating…" : "Create bug from this run"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminQcSmoke;
