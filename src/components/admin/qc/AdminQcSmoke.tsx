import { useRef, useState } from "react";
import { Upload, FileText, CheckCircle2, AlertTriangle, Bug, Paperclip, X, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  PLATFORMS, type QcPlatform, qc,
} from "./lib/qcShared";
import { parseSmokeReport, suggestedSeverityForCase, caseLabels, type ParsedSmokeReport } from "./lib/parseSmokeReport";

const BUCKET = "qc-attachments";
const IMG_RE = /\.(png|jpe?g|webp|gif)$/i;

const safeName = (name: string) =>
  name.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 80);

const AdminQcSmoke = () => {
  const [parsed, setParsed] = useState<ParsedSmokeReport | null>(null);
  const [rawMd, setRawMd] = useState<string>("");
  const [build, setBuild] = useState("");
  const [platform, setPlatform] = useState<QcPlatform>("android");
  const [device, setDevice] = useState("");
  const [scenario, setScenario] = useState("Cold launch, online");
  const [notes, setNotes] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [uploadedPaths, setUploadedPaths] = useState<string[]>([]);
  const [savedRunId, setSavedRunId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [creatingBug, setCreatingBug] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const attachRef = useRef<HTMLInputElement>(null);

  const handleFile = async (f: File) => {
    const text = await f.text();
    const p = parseSmokeReport(text);
    setParsed(p);
    setRawMd(text);
    if (p.device && !device) setDevice(p.device);
    setSavedRunId(null);
    setUploadedPaths([]);
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

  const onAttachPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setAttachments((prev) => [...prev, ...files]);
    if (attachRef.current) attachRef.current.value = "";
  };

  const removeAttachment = (idx: number) =>
    setAttachments((prev) => prev.filter((_, i) => i !== idx));

  const uploadAttachments = async (): Promise<string[]> => {
    if (!attachments.length) return [];
    const { data: userRes } = await supabase.auth.getUser();
    const reporterId = userRes.user?.id ?? "anon";
    const stamp = Date.now();
    const paths: string[] = [];
    for (const f of attachments) {
      const path = `runs/${reporterId}/${stamp}-${safeName(f.name)}`;
      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(path, f, { upsert: false, contentType: f.type || undefined });
      if (error) throw new Error(`Upload failed for ${f.name}: ${error.message}`);
      paths.push(path);
    }
    return paths;
  };

  const openAttachment = async (path: string) => {
    const { data, error } = await supabase.storage
      .from(BUCKET).createSignedUrl(path, 3600);
    if (error || !data?.signedUrl) { toast.error(error?.message ?? "Could not sign URL"); return; }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  const save = async () => {
    if (!parsed) { toast.error("Upload a smoke-report.md first"); return; }
    if (!build.trim()) { toast.error("Build version is required"); return; }
    setSaving(true);
    let paths: string[] = [];
    try {
      paths = await uploadAttachments();
    } catch (e: any) {
      setSaving(false);
      toast.error(e.message ?? "Attachment upload failed");
      return;
    }
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
      attachment_paths: paths,
    };
    const { data, error } = await qc("qc_test_runs").insert(payload).select("id").single();
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    setSavedRunId((data as any).id);
    setUploadedPaths(paths);
    toast.success(`Smoke report saved${paths.length ? ` with ${paths.length} attachment(s)` : ""}`);
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
      screenshot_paths: uploadedPaths.filter((p) => IMG_RE.test(p)),
    };
    const { error } = await qc("qc_bugs").insert(payload);
    setCreatingBug(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Bug created from smoke run");
  };

  const reset = () => {
    setParsed(null); setRawMd(""); setSavedRunId(null);
    setAttachments([]); setUploadedPaths([]);
    if (fileRef.current) fileRef.current.value = "";
    if (attachRef.current) attachRef.current.value = "";
  };

  const displayCaseLabel = parsed?.caseLabel
    || (parsed?.caseCode ? caseLabels[parsed.caseCode] : null)
    || "—";

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
              <p className="text-sm font-semibold text-slate-100 flex items-center gap-2 flex-wrap">
                Verdict: {parsed.verdict.toUpperCase()}
                {parsed.caseCode && (
                  <>
                    <span className="text-amber-400">Case {parsed.caseCode}</span>
                    <span className="text-[10px] font-normal text-slate-500">auto-classified</span>
                  </>
                )}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">{displayCaseLabel}</p>
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

          {/* Attachments */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">
                Attach screenshots, raw logcat, or profile dumps (optional)
              </span>
              <button
                type="button"
                disabled={!!savedRunId}
                onClick={() => attachRef.current?.click()}
                className="text-xs px-2.5 py-1 rounded-md border border-slate-700 text-slate-300 hover:bg-slate-800 disabled:opacity-40 flex items-center gap-1.5"
              >
                <Paperclip size={12} /> Add files
              </button>
              <input
                ref={attachRef}
                type="file"
                multiple
                accept="image/*,.txt,.log,text/plain"
                className="hidden"
                onChange={onAttachPick}
              />
            </div>

            {!savedRunId && attachments.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {attachments.map((f, i) => (
                  <span key={`${f.name}-${i}`} className="inline-flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-md bg-slate-800 text-slate-200">
                    {f.name}
                    <span className="text-slate-500">{(f.size / 1024).toFixed(0)}kb</span>
                    <button onClick={() => removeAttachment(i)} className="text-slate-500 hover:text-red-300">
                      <X size={11} />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {savedRunId && uploadedPaths.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {uploadedPaths.map((p) => (
                  <button
                    key={p}
                    onClick={() => openAttachment(p)}
                    className="inline-flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-md bg-slate-800 text-slate-200 hover:bg-slate-700"
                  >
                    {p.split("/").pop()}
                    <ExternalLink size={11} className="text-slate-400" />
                  </button>
                ))}
              </div>
            )}
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
