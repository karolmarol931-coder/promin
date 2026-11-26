const STORAGE_KEY = "promin.diagnostic-events.v1";
const MAX_EVENTS = 300;
const MAX_STACK_FRAMES = 8;

export type DiagnosticLevel = "info" | "warning" | "error";

export interface DiagnosticEvent {
  id: string;
  timestamp: string;
  level: DiagnosticLevel;
  source: string;
  event: string;
  details: Record<string, string | number>;
  stack?: string[];
}

export interface DiagnosticReport {
  application: string;
  version: string;
  createdAt: string;
  platform: string;
  userAgent: string;
  events: DiagnosticEvent[];
}

type DiagnosticDetails = Record<string, string | number | undefined>;

const SAFE_DETAIL_KEYS = new Set([
  "operationId",
  "endpoint",
  "phase",
  "provider",
  "fileSizeBytes",
  "fieldCount",
  "pageCount",
  "httpStatus",
  "errorType",
  "errorCode",
  "durationMs",
]);

function safeToken(value: string, maxLength = 80): string | null {
  const trimmed = value.trim();
  return /^[a-zA-Z0-9_.:-]+$/.test(trimmed) && trimmed.length <= maxLength
    ? trimmed
    : null;
}

function safeDetails(
  details: DiagnosticDetails,
): Record<string, string | number> {
  const safe: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(details)) {
    if (!SAFE_DETAIL_KEYS.has(key) || value === undefined) continue;
    if (typeof value === "number" && Number.isFinite(value)) {
      safe[key] = value;
    } else if (typeof value === "string") {
      const token = key === "endpoint" ? safeEndpoint(value) : safeToken(value);
      if (token !== null) safe[key] = token;
    }
  }
  return safe;
}

function safeEndpoint(value: string): string | null {
  const path = value.split("?", 1)[0] ?? "";
  const apiStart = path.indexOf("/api/v");
  if (apiStart < 0) return "unknown";
  const route = path
    .slice(apiStart)
    .match(/^\/api\/v\d+\/[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)?/);
  return route?.[0] ?? "unknown";
}

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function readEvents(): DiagnosticEvent[] {
  try {
    const serialized = localStorage.getItem(STORAGE_KEY);
    if (!serialized) return [];
    const parsed: unknown = JSON.parse(serialized);
    if (!Array.isArray(parsed)) return [];
    return parsed.slice(-MAX_EVENTS) as DiagnosticEvent[];
  } catch {
    return [];
  }
}

function persist(events: DiagnosticEvent[]): void {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(events.slice(-MAX_EVENTS)),
    );
  } catch {
    // Diagnostics must never interfere with editing or saving a document.
  }
}

export function createDiagnosticOperationId(): string {
  return newId();
}

export function getDiagnosticEvents(): DiagnosticEvent[] {
  return readEvents();
}

export function recordDiagnosticEvent(
  level: DiagnosticLevel,
  source: string,
  event: string,
  details: DiagnosticDetails = {},
  stack?: string[],
): void {
  const safeSource = safeToken(source, 40);
  const safeEvent = safeToken(event, 100);
  if (!safeSource || !safeEvent) return;

  const events = readEvents();
  events.push({
    id: newId(),
    timestamp: new Date().toISOString(),
    level,
    source: safeSource,
    event: safeEvent,
    details: safeDetails(details),
    ...(stack?.length ? { stack: stack.slice(0, MAX_STACK_FRAMES) } : {}),
  });
  persist(events);
}

function errorMetadata(error: unknown): {
  errorType: string;
  httpStatus?: number;
  errorCode?: string;
  stack?: string[];
} {
  const candidate = error as {
    name?: unknown;
    stack?: unknown;
    response?: { status?: unknown; data?: { errorCode?: unknown } };
  } | null;
  const errorType =
    typeof candidate?.name === "string"
      ? (safeToken(candidate.name, 60) ?? "Error")
      : "UnknownError";
  const status = candidate?.response?.status;
  const errorCode = candidate?.response?.data?.errorCode;
  const stack =
    typeof candidate?.stack === "string"
      ? candidate.stack
          .split("\n")
          .slice(1)
          .map((line) =>
            line
              .replace(/\/Users\/[^)\n]*/g, "[local-path]")
              .replace(/\/home\/[^)\n]*/g, "[local-path]")
              .replace(/[A-Z]:\\[^)\n]*/g, "[local-path]")
              .replace(/https?:\/\/[^\s)]+/g, "[app-url]"),
          )
          .filter((line) => line.trim() !== "")
          .slice(0, MAX_STACK_FRAMES)
      : undefined;

  return {
    errorType,
    ...(typeof status === "number" ? { httpStatus: status } : {}),
    ...(typeof errorCode === "string" && safeToken(errorCode, 60)
      ? { errorCode }
      : {}),
    ...(stack?.length ? { stack } : {}),
  };
}

export function recordDiagnosticException(
  source: string,
  event: string,
  error: unknown,
  details: DiagnosticDetails = {},
): void {
  const metadata = errorMetadata(error);
  recordDiagnosticEvent(
    "error",
    source,
    event,
    {
      ...details,
      errorType: metadata.errorType,
      httpStatus: metadata.httpStatus,
      errorCode: metadata.errorCode,
    },
    metadata.stack,
  );
}

export function createDiagnosticReport(version = "unknown"): DiagnosticReport {
  return {
    application: "Promin Desktop",
    version: safeToken(version, 40) ?? "unknown",
    createdAt: new Date().toISOString(),
    platform: typeof navigator === "undefined" ? "unknown" : navigator.platform,
    userAgent:
      typeof navigator === "undefined" ? "unknown" : navigator.userAgent,
    events: getDiagnosticEvents(),
  };
}

export function downloadDiagnosticReport(version = "unknown"): void {
  const report = createDiagnosticReport(version);
  const blob = new Blob([JSON.stringify(report, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `promin-diagnostics-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function installDiagnosticHandlers(): () => void {
  const onError = (event: ErrorEvent) => {
    recordDiagnosticException("window", "uncaught-error", event.error);
  };
  const onRejection = (event: PromiseRejectionEvent) => {
    recordDiagnosticException("window", "unhandled-rejection", event.reason);
  };
  window.addEventListener("error", onError);
  window.addEventListener("unhandledrejection", onRejection);
  return () => {
    window.removeEventListener("error", onError);
    window.removeEventListener("unhandledrejection", onRejection);
  };
}
