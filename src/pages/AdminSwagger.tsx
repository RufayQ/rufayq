/**
 * /admin/swagger — Swagger UI for the RufayQ API.
 *
 * Admin-only. Loads Swagger UI from CDN to keep the bundle slim and exposes
 * a "Download OpenAPI JSON" button that exports the spec defined in
 * `src/api/openapi.ts`.
 */
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, BookOpen, Download, Shield } from "lucide-react";
import { openApiSpec } from "@/api/openapi";

const SWAGGER_VERSION = "5.17.14";
const SWAGGER_CSS = `https://cdn.jsdelivr.net/npm/swagger-ui-dist@${SWAGGER_VERSION}/swagger-ui.css`;
const SWAGGER_BUNDLE = `https://cdn.jsdelivr.net/npm/swagger-ui-dist@${SWAGGER_VERSION}/swagger-ui-bundle.js`;
const SWAGGER_PRESET = `https://cdn.jsdelivr.net/npm/swagger-ui-dist@${SWAGGER_VERSION}/swagger-ui-standalone-preset.js`;

declare global {
  interface Window {
    SwaggerUIBundle?: any;
    SwaggerUIStandalonePreset?: any;
  }
}

const loadScript = (src: string) =>
  new Promise<void>((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(s);
  });

const loadCss = (href: string) => {
  if (document.querySelector(`link[href="${href}"]`)) return;
  const l = document.createElement("link");
  l.rel = "stylesheet";
  l.href = href;
  document.head.appendChild(l);
};

const AdminSwagger = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const [authState, setAuthState] = useState<"checking" | "allowed" | "denied">("checking");

  // ── RBAC gate: admin role required. Server RLS remains source of truth.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { authClient } = await import("@/api");
      const res = await authClient.current();
      if (cancelled) return;
      const isAdmin = !!res.data?.roles.includes("admin");
      setAuthState(isAdmin ? "allowed" : "denied");
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (authState !== "allowed") return;
    let cancelled = false;
    loadCss(SWAGGER_CSS);
    Promise.all([loadScript(SWAGGER_BUNDLE), loadScript(SWAGGER_PRESET)])
      .then(() => {
        if (cancelled || !mountRef.current || !window.SwaggerUIBundle) return;
        window.SwaggerUIBundle({
          spec: openApiSpec,
          domNode: mountRef.current,
          deepLinking: true,
          presets: [
            window.SwaggerUIBundle.presets.apis,
            window.SwaggerUIStandalonePreset,
          ],
          layout: "BaseLayout",
          docExpansion: "list",
          defaultModelsExpandDepth: 1,
          tryItOutEnabled: true,
        });
      })
      .catch((e) => console.error("Swagger UI failed to load:", e));
    return () => { cancelled = true; };
  }, [authState]);

  const downloadSpec = () => {
    const blob = new Blob([JSON.stringify(openApiSpec, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rufayq-openapi-${(openApiSpec as any).info?.version ?? "1.0.0"}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (authState === "checking") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-400 text-sm">
        Verifying admin access…
      </div>
    );
  }

  if (authState === "denied") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-slate-300 px-6 text-center">
        <Shield size={42} className="mb-4 text-amber-400" />
        <h1 className="text-2xl font-semibold mb-2">Admin access required</h1>
        <p className="text-sm text-slate-400 mb-6">
          The Swagger reference is restricted to staff with the admin role.
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => navigate("/admin/login")}
            className="px-5 py-2.5 rounded-full bg-amber-500 text-slate-950 text-sm font-semibold"
          >
            Sign in as admin
          </button>
          <Link
            to="/admin"
            className="px-5 py-2.5 rounded-full border border-slate-700 text-slate-300 text-sm font-semibold"
          >
            Back to admin
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <header className="max-w-6xl mx-auto p-6 pb-2">
        <Link
          to="/admin"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 mb-4"
        >
          <ArrowLeft size={14} /> Back to admin
        </Link>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold text-slate-50 flex items-center gap-2">
              <BookOpen size={22} className="text-amber-400" /> RufayQ API · Swagger
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              OpenAPI 3.1 reference for every resource exposed via{" "}
              <code className="px-1.5 py-0.5 rounded bg-slate-800 text-amber-300 font-mono text-xs">
                @/api
              </code>
              . Includes Patient app and Provider Portal integration endpoints.
            </p>
          </div>
          <button
            onClick={downloadSpec}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-amber-500 text-slate-950 text-sm font-semibold hover:bg-amber-400 transition"
          >
            <Download size={14} /> Download OpenAPI JSON
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 pb-10">
        <div className="rounded-xl bg-white text-slate-900 overflow-hidden">
          <div ref={mountRef} />
        </div>
      </div>
    </div>
  );
};

export default AdminSwagger;
