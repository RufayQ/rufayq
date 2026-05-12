/**
 * Shared flight-ticket extraction helper.
 *
 * Calls the OpenAI-powered `extract-flight-ticket-ai` edge function first,
 * silently falls back to the Gemini-powered `scan-itinerary` engine if the
 * primary call fails or returns no data, and normalizes both responses into
 * one app-level contract so callers (ScannerWizard, AddTripSheet, future
 * surfaces) don't have to care which engine produced the result.
 */
import { supabase } from "@/integrations/supabase/client";
import { getDeviceId } from "@/hooks/useDeviceId";
import { normalizeParsedLeg } from "@/lib/flightParsing";
import type { FlightInfo } from "@/components/AddTripSheet";

export type FlightExtractionProvider = "openai" | "gemini";

export interface NormalizedFlightExtraction {
  provider: FlightExtractionProvider;
  /** Normalized first outbound leg for legacy single-leg renderers. */
  outboundFlight: FlightInfo | null;
  /** Normalized first return leg for legacy single-leg renderers. */
  returnFlight: FlightInfo | null;
  /** All outbound legs in chronological order (transit-aware). */
  outboundSegments: FlightInfo[];
  /** All return legs in chronological order (transit-aware). */
  returnSegments: FlightInfo[];
  /** Raw outbound legs as the engine returned them (pre-normalization). */
  rawOutbound: any[];
  /** Raw return legs as the engine returned them (pre-normalization). */
  rawReturn: any[];
  passengerFirstName?: string | null;
  passengerLastName?: string | null;
  passportNumber?: string | null;
  detectedLanguage?: string | null;
  translated?: boolean;
  confidence?: number;
  /** The full raw response payload, for debugging / future migration. */
  raw: any;
}

export class FlightExtractionError extends Error {
  constructor(message: string, public code: "no-data" | "no-legs" | "transport") {
    super(message);
  }
}

interface ExtractInput {
  file?: string;
  files?: string[];
  text?: string;
}

/**
 * Run AI vision extraction on a flight ticket image (or set of images).
 * Throws FlightExtractionError when no usable result can be produced.
 */
export async function extractFlightTicket(
  input: ExtractInput,
): Promise<NormalizedFlightExtraction> {
  const headers = { "x-device-id": getDeviceId() };
  const body: ExtractInput = {};
  if (input.file) body.file = input.file;
  if (input.files && input.files.length > 0) body.files = input.files;
  if (input.text) body.text = input.text;

  let parsed: any = null;
  let provider: FlightExtractionProvider | null = null;

  // Primary: OpenAI vision (gpt-5).
  try {
    const { data, error } = await supabase.functions.invoke(
      "extract-flight-ticket-ai",
      { body, headers },
    );
    if (!error && (data as any)?.data && typeof (data as any).data === "object") {
      parsed = (data as any).data;
      provider = "openai";
    } else if (error) {
      console.warn("[flightExtraction] OpenAI primary failed, falling back", error);
    }
  } catch (e) {
    console.warn("[flightExtraction] OpenAI primary threw, falling back", e);
  }

  // Fallback: Gemini.
  if (!parsed) {
    try {
      const { data, error } = await supabase.functions.invoke("scan-itinerary", {
        body,
        headers,
      });
      if (error) {
        console.error("[flightExtraction] Gemini fallback errored", error);
        throw new FlightExtractionError("Both AI engines failed", "transport");
      }
      parsed = (data as any)?.data ?? null;
      if (!parsed || typeof parsed !== "object") {
        throw new FlightExtractionError("AI returned no parsable data", "no-data");
      }
      provider = "gemini";
    } catch (e) {
      if (e instanceof FlightExtractionError) throw e;
      throw new FlightExtractionError(
        e instanceof Error ? e.message : "Extraction failed",
        "transport",
      );
    }
  }

  console.info("[flightExtraction] provider:", provider);

  // Normalize: prefer rich segment arrays, fall back to legacy single legs.
  const rawOutbound: any[] = Array.isArray(parsed.outboundSegments) && parsed.outboundSegments.length > 0
    ? parsed.outboundSegments
    : parsed.outboundFlight ? [parsed.outboundFlight] : [];
  const rawReturn: any[] = Array.isArray(parsed.returnSegments) && parsed.returnSegments.length > 0
    ? parsed.returnSegments
    : parsed.returnFlight ? [parsed.returnFlight] : [];

  const outboundSegments = rawOutbound.map(normalizeParsedLeg);
  const returnSegments = rawReturn.map(normalizeParsedLeg);

  if (outboundSegments.length === 0 && returnSegments.length === 0) {
    throw new FlightExtractionError("No flight legs detected", "no-legs");
  }

  return {
    provider: provider ?? "openai",
    outboundFlight: outboundSegments[0] ?? null,
    returnFlight: returnSegments[0] ?? null,
    outboundSegments,
    returnSegments,
    rawOutbound,
    rawReturn,
    passengerFirstName: parsed.passengerFirstName ?? null,
    passengerLastName: parsed.passengerLastName ?? null,
    passportNumber: parsed.passportNumber ?? null,
    detectedLanguage: parsed.detectedLanguage ?? null,
    translated: !!parsed.translated,
    confidence: typeof parsed.confidence === "number" ? parsed.confidence : undefined,
    raw: parsed,
  };
}
