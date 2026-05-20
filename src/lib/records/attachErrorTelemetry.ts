import { supabase } from "@/integrations/supabase/client";

interface AttachErrorTelemetryInput {
  stage: string;
  route: string;
  deviceId: string;
  rowId?: string | null;
  error: unknown;
}

const toErrorName = (error: unknown) =>
  error && typeof error === "object" && "name" in error && typeof (error as { name?: unknown }).name === "string"
    ? (error as { name: string }).name
    : "Error";

const toStack = (error: unknown) =>
  error && typeof error === "object" && "stack" in error && typeof (error as { stack?: unknown }).stack === "string"
    ? (error as { stack: string }).stack
    : undefined;

const hashDeviceId = async (deviceId: string): Promise<string> => {
  try {
    const bytes = new TextEncoder().encode(deviceId);
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
  } catch {
    let hash = 0;
    for (let i = 0; i < deviceId.length; i += 1) hash = ((hash << 5) - hash + deviceId.charCodeAt(i)) | 0;
    return `fallback-${Math.abs(hash).toString(16)}`;
  }
};

export const shortCause = (error: unknown) => {
  const msg = error && typeof error === "object" && "message" in error
    ? String((error as { message?: unknown }).message ?? "unknown error")
    : String(error ?? "unknown error");
  return msg.length > 90 ? `${msg.slice(0, 87)}…` : msg;
};

export const logAttachErrorTelemetry = async ({ stage, route, deviceId, rowId, error }: AttachErrorTelemetryInput) => {
  const deviceHash = await hashDeviceId(deviceId);
  const rowIdShort = rowId ? rowId.slice(0, 18) : "none";
  const errorName = toErrorName(error);
  const recurrentKey = `${route}:${stage}:${errorName}:${rowIdShort}`;

  console.error("[AttachFromRecords] attach failure", {
    stage,
    route,
    deviceHash,
    rowIdShort,
    errorName,
    stack: toStack(error),
  });

  try {
    await (supabase as any).rpc("log_attach_error_event", {
      _stage: stage,
      _route: route,
      _device_hash: deviceHash,
      _row_id_short: rowIdShort,
      _error_name: errorName,
      _recurrent_key: recurrentKey,
    });
  } catch (telemetryError) {
    console.warn("[AttachFromRecords] telemetry write failed", {
      route,
      stage,
      errorName: toErrorName(telemetryError),
    });
  }
};