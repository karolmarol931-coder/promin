const STORAGE_KEY = "promin.diagnostic-events.v1";
const ACTIVE_SESSION_KEY = "promin.diagnostic-active-session.v1";
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
  errorSummary?: string;
  stack?: string[];
}

export interface DiagnosticReport {
  application: string;
  version: string;
  schemaVersion: number;
  backendVersion?: string;
  createdAt: string;
  platform: string;
  userAgent: string;
  events: DiagnosticEvent[];
  nativeLogs: string[];
}

type DiagnosticDetails = Record<string, string | number | undefined>;

const SAFE_DETAIL_KEYS = new Set([
  "operationId",
  "action",
  "endpoint",
  "phase",
  "provider",
  "fileSizeBytes",
  "fieldCount",
  "filledValueCount",
  "pageCount",
  "httpStatus",
  "errorType",
  "errorCode",
  "durationMs",
]);

function safeToken(value: string, maxLength = 80): string | null {
  const trimmed = value.trim();
  return /^[a-zA-Z0-9_.:-]+$/.test(trimmed) && trimmed.length <= maxLength ? trimmed : null;
}

function safeErrorSummary(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const summary = value.replace(/\s+/g, " ").trim();
  const safeMessages = [
    /^The object (?:can not|cannot) be found here\.?$/i,
    /^Could not (?:open|load) the PDF print preview\.?$/i,
    /^No PDF source available for native print\.?$/i,
    /^PDFKit did not create a print operation\.?$/i,
    /^The PDF viewer is not ready to save\.?$/i,
    /^The viewer did not return PDF data\.?$/i,
    /^There is no active PDF to save\.?$/i,
    /^Form data does not match the active PDF\.?$/i,
    /^Failed to fetch\.?$/i,
    /^Network Error\.?$/i,
    /^Load failed\.?$/i,
    /^Request failed with status code \d{3}\.?$/i,
    /^timeout of \d+ms exceeded\.?$/i,
  ];
  return safeMessages.some((pattern) => pattern.test(summary)) ? summary : undefined;
}

function safeNativeLogLine(value: string): string {
  return value
    .replace(
      /("?(?:value|values|fieldValue|fieldValues|formData|contents|content|text|filename|fileName|path|filePath|email|phone|address|name)"?\s*[:=]\s*)("(?:\\.|[^"\\])*"|'[^']*'|[^,}\s]+)/gi,
      "$1[redacted]",
    )
    .replace(/\bfield\s+["'`]?[^\s,;"'`]+/gi, "field [redacted]")
    .replace(/https?:\/\/\S+/gi, "[url]")
    .replace(/(?:\/Users\/|\/home\/)[^\s,;)]*/g, "[local-path]")
    .replace(/[A-Z]:\\Users\\[^\s,;)]*/gi, "[local-path]")
    .replace(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi, "[email]")
    .replace(/\b[^\s/\\]+\.(?:pdf|docx?|xlsx?|pptx?|png|jpe?g|tiff?)\b/gi, "[file]")
    .replace(/(?:\/[^\s:]+)+\.(?:java|rs|ts|tsx|js|jsx):\d+(?::\d+)?/gi, "[source-location]")
    .replace(/(['"`])[^\n]*?\1/g, "$1[redacted]$1")
    .slice(0, 500);
}

function safeDetails(details: DiagnosticDetails): Record<string, string | number> {
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
  const route = path.slice(apiStart).match(/^\/api\/v\d+\/[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)?/);
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
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events.slice(-MAX_EVENTS)));
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
  errorSummary?: string,
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
    ...(errorSummary ? { errorSummary } : {}),
    ...(stack?.length ? { stack: stack.slice(0, MAX_STACK_FRAMES) } : {}),
  });
  persist(events);
}

function errorMetadata(error: unknown): {
  errorType: string;
  errorSummary?: string;
  httpStatus?: number;
  errorCode?: string;
  stack?: string[];
} {
  const candidate = error as {
    name?: unknown;
    message?: unknown;
    stack?: unknown;
    response?: { status?: unknown; data?: { errorCode?: unknown } };
  } | null;
  const errorType = typeof candidate?.name === "string" ? (safeToken(candidate.name, 60) ?? "Error") : "UnknownError";
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
    ...(typeof candidate?.message === "string" ? { errorSummary: safeErrorSummary(candidate.message) } : {}),
    ...(typeof status === "number" ? { httpStatus: status } : {}),
    ...(typeof errorCode === "string" && safeToken(errorCode, 60) ? { errorCode } : {}),
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
    metadata.errorSummary,
  );
}

export function createDiagnosticReport(
  version = "unknown",
  nativeLogs: string[] = [],
  backendVersion?: string,
): DiagnosticReport {
  const safeBackendVersion = safeToken(backendVersion ?? "", 40);
  return {
    application: "Promin Desktop",
    version: safeToken(version, 40) ?? "unknown",
    schemaVersion: 2,
    ...(safeBackendVersion ? { backendVersion: safeBackendVersion } : {}),
    createdAt: new Date().toISOString(),
    platform: typeof navigator === "undefined" ? "unknown" : navigator.platform,
    userAgent: typeof navigator === "undefined" ? "unknown" : navigator.userAgent,
    events: getDiagnosticEvents(),
    nativeLogs: nativeLogs.slice(-1500).map(safeNativeLogLine),
  };
}

export function downloadDiagnosticReport(version = "unknown", nativeLogs: string[] = [], backendVersion?: string): void {
  const report = createDiagnosticReport(version, nativeLogs, backendVersion);
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
  const sessionId = newId();
  try {
    const previousSession = localStorage.getItem(ACTIVE_SESSION_KEY);
    if (previousSession) {
      recordDiagnosticEvent("warning", "lifecycle", "previous-session-ended-unexpectedly", { operationId: previousSession });
    }
    localStorage.setItem(ACTIVE_SESSION_KEY, sessionId);
  } catch {
    // Diagnostics storage must never prevent the application from starting.
  }

  const onError = (event: ErrorEvent) => {
    recordDiagnosticException("window", "uncaught-error", event.error);
  };
  const onRejection = (event: PromiseRejectionEvent) => {
    recordDiagnosticException("window", "unhandled-rejection", event.reason);
  };
  const originalConsoleError = console.error;
  const onConsoleError = (...args: unknown[]) => {
    const error = args.find((value): value is Error => value instanceof Error);
    const sourceLabel = typeof args[0] === "string" ? args[0].match(/^\[([a-zA-Z0-9_.:-]{1,60})\]/)?.[1] : undefined;
    if (error) {
      recordDiagnosticException("console", "logged-error", error, {
        errorCode: sourceLabel,
      });
    } else {
      recordDiagnosticEvent("error", "console", "logged-error", {
        errorType: "LoggedMessage",
        errorCode: sourceLabel,
      });
    }
    originalConsoleError.apply(console, args);
  };
  const onPageHide = () => {
    try {
      if (localStorage.getItem(ACTIVE_SESSION_KEY) === sessionId) {
        localStorage.removeItem(ACTIVE_SESSION_KEY);
      }
    } catch {
      // Ignore unavailable browser storage during shutdown.
    }
  };
  window.addEventListener("error", onError);
  window.addEventListener("unhandledrejection", onRejection);
  window.addEventListener("pagehide", onPageHide);
  console.error = onConsoleError;
  return () => {
    window.removeEventListener("error", onError);
    window.removeEventListener("unhandledrejection", onRejection);
    window.removeEventListener("pagehide", onPageHide);
    if (console.error === onConsoleError) console.error = originalConsoleError;
    onPageHide();
  };
}
