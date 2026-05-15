/**
 * Feature flag for AI-powered flight ticket extraction.
 *
 * The AI extraction pipeline (OpenAI primary → Gemini fallback via the
 * `extract-flight-ticket-ai` edge function) is currently unstable and can
 * leave the user waiting on a long-running request that ultimately fails.
 *
 * While disabled, ScannerWizard skips the upload + AI steps for flights
 * and routes the user straight to manual entry (with autosaved drafts).
 *
 * Flip to `true` once the edge-function wiring is verified end-to-end.
 */
export const FLIGHT_AI_ENABLED = false;
