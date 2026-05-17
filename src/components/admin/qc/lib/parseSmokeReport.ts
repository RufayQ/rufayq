// Pure parser for the markdown emitted by scripts/qa/android-smoke-report.sh.
// Used by AdminQcSmoke to prefill a qc_test_runs row from an uploaded report.

export interface ParsedSmokeReport {
  verdict: "pass" | "fail" | "unknown";
  caseCode: number | null;
  caseLabel: string | null;
  caseSubtags: string[];
  logcatExcerpt: string | null;
  startupChecklist: Record<string, string>;
  pushChecklist: Record<string, string>;
  device: string | null;
  packageName: string | null;
  activity: string | null;
  capacitorMode: string | null;
}

const empty = (): ParsedSmokeReport => ({
  verdict: "unknown",
  caseCode: null,
  caseLabel: null,
  caseSubtags: [],
  logcatExcerpt: null,
  startupChecklist: {},
  pushChecklist: {},
  device: null,
  packageName: null,
  activity: null,
  capacitorMode: null,
});

const stripMd = (s: string) =>
  s.replace(/\*\*/g, "").replace(/`/g, "").trim();

export function parseSmokeReport(markdown: string): ParsedSmokeReport {
  const out = empty();
  if (!markdown) return out;

  // Header fields
  const grab = (re: RegExp) => {
    const m = markdown.match(re);
    return m ? stripMd(m[1]) : null;
  };
  out.device = grab(/^Device:\s*(.+)$/m);
  out.packageName = grab(/^Package:\s*(.+)$/m);
  out.activity = grab(/^Activity:\s*(.+)$/m);
  out.capacitorMode = grab(/^Local capacitor mode:\s*(.+)$/m);

  // Verdict line
  // PASS:   "Verdict: PASS"
  // FAIL:   "Verdict: FAIL — Case 2: Remote URL / network failure [+FIREBASE_INIT_FAIL, +ERROR_BOUNDARY]"
  const passMatch = markdown.match(/^Verdict:\s*PASS\b/m);
  if (passMatch) out.verdict = "pass";

  const failMatch = markdown.match(
    /^Verdict:\s*FAIL\s*[—-]\s*Case\s*(\d)\s*:\s*([^\[\n]+?)(?:\s*\[\+([^\]]+)\])?\s*$/m
  );
  if (failMatch) {
    out.verdict = "fail";
    out.caseCode = Number(failMatch[1]);
    out.caseLabel = failMatch[2].trim();
    if (failMatch[3]) {
      out.caseSubtags = failMatch[3]
        .split(",")
        .map((s) => s.trim().replace(/^\+/, ""))
        .filter(Boolean);
    }
  }

  // Logcat fenced block under "## Full adb logcat"
  const logcatMatch = markdown.match(
    /##\s*Full adb logcat\s*\n+```(?:log)?\n([\s\S]*?)\n```/
  );
  if (logcatMatch) out.logcatExcerpt = logcatMatch[1];

  // Checklists — bullets like "- React mounted: **yes**"
  const parseSection = (title: string): Record<string, string> => {
    const re = new RegExp(`##\\s*${title}\\s*\\n([\\s\\S]*?)(?=\\n##\\s|$)`, "i");
    const block = markdown.match(re);
    if (!block) return {};
    const map: Record<string, string> = {};
    for (const line of block[1].split("\n")) {
      const m = line.match(/^-\s*([^:]+):\s*(.+)$/);
      if (!m) continue;
      map[m[1].trim()] = stripMd(m[2]);
    }
    return map;
  };
  out.startupChecklist = parseSection("Startup checklist");
  out.pushChecklist = parseSection("Push / FCM checklist");

  return out;
}

export const caseLabels: Record<number, string> = {
  1: "JS never reached React boot",
  2: "Remote URL / network failure",
  3: "JS / chunk load failure",
  4: "Native crash",
  5: "WebView renderer crash",
  6: "Memory pressure",
};

export const suggestedSeverityForCase = (
  caseCode: number | null
): "blocker" | "critical" | "major" | "minor" | "trivial" => {
  if (caseCode === null) return "major";
  if (caseCode >= 4) return "critical";
  return "major";
};
