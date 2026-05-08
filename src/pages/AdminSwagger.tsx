/**
 * /admin/swagger — Swagger UI for the RufayQ API.
 *
 * Serves the hand-curated OpenAPI 3.1 spec that mirrors the resources
 * already documented in /admin/api-docs. Swagger UI is loaded from CDN
 * to avoid pulling a multi-MB dependency into the main bundle.
 */
import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, BookOpen } from "lucide-react";
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

  useEffect(() => {
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
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <header className="max-w-6xl mx-auto p-6 pb-2">
        <Link
          to="/admin"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 mb-4"
        >
          <ArrowLeft size={14} /> Back to admin
        </Link>
        <h1 className="text-2xl font-semibold text-slate-50 flex items-center gap-2">
          <BookOpen size={22} className="text-amber-400" /> RufayQ API · Swagger
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          OpenAPI 3.1 reference for every resource exposed via{" "}
          <code className="px-1.5 py-0.5 rounded bg-slate-800 text-amber-300 font-mono text-xs">
            @/api
          </code>
          . For prose docs and copy-paste examples see{" "}
          <Link to="/admin/api-docs" className="text-amber-300 hover:underline">
            /admin/api-docs
          </Link>
          .
        </p>
      </header>

      {/* Swagger UI ships its own light styling; wrap in a white card so it
          stays legible inside the dark admin shell. */}
      <div className="max-w-6xl mx-auto px-6 pb-10">
        <div className="rounded-xl bg-white text-slate-900 overflow-hidden">
          <div ref={mountRef} />
        </div>
      </div>
    </div>
  );
};

export default AdminSwagger;
