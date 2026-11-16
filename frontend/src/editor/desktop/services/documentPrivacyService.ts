import i18n from "@editor/i18n";
import { tauriBackendService } from "@editor/services/tauriBackendService";

export function requiresOffDeviceProcessing(endpoint: string): boolean {
  const path = decodeURIComponent(new URL(endpoint, "http://local").pathname);
  return (
    /^\/api\/v1\/(?:ai|storage|sharing|share|signing|workflow|policies|processing-folders|automation|pipeline)(?:\/|$)/.test(
      path,
    ) ||
    /^\/api\/v1\/convert\/url\/pdf(?:\/|$)/.test(path) ||
    /^\/api\/v1\/security\/(?:timestamp-pdf(?:\/|$)|cert-sign\/)/.test(path)
  );
}

export function isOffDeviceEndpointName(endpoint: string): boolean {
  return [
    "automate",
    "classify-and-label",
    "form-detection",
    "timestamp-pdf",
    "url-to-pdf",
  ].includes(endpoint);
}

export function documentPrivacyError(): Error {
  return new Error(
    i18n.t(
      "desktopPrivacy.blocked",
      "This feature is unavailable in the local app.",
    ),
  );
}

export async function isLocalProcessingOnly(): Promise<boolean> {
  return true;
}

function isWithinBase(url: URL, base: string): boolean {
  const parsed = new URL(base);
  const prefix = parsed.pathname.replace(/\/$/, "");
  return (
    url.origin === parsed.origin &&
    (url.pathname === prefix || url.pathname.startsWith(`${prefix}/`))
  );
}

export async function enforceDocumentPrivacy(
  url: string,
  _method: string,
  _data?: unknown,
): Promise<boolean> {
  const target = new URL(url);
  if (requiresOffDeviceProcessing(target.href)) throw documentPrivacyError();
  const localUrl = tauriBackendService.getBackendUrl();
  if (localUrl && isWithinBase(target, localUrl)) return true;
  throw documentPrivacyError();
}
