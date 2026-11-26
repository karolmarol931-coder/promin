/**
 * Desktop-specific API client using Tauri's native HTTP client
 * This file overrides @editor-core/services/apiClient.ts for desktop builds
 * Bypasses CORS restrictions by using native HTTP instead of browser fetch
 */

import type { AxiosInstance } from "axios";
import { create } from "@editor/services/tauriHttpClient";
import { handleHttpError } from "@editor/services/httpErrorHandler";
import { setupApiInterceptors } from "@editor/services/apiClientSetup";
import { getApiBaseUrl } from "@editor/services/apiClientConfig";
import { recordDiagnosticException } from "@editor/services/diagnosticLog";

// Create Tauri HTTP client with default config
const apiClient = create({
  baseURL: getApiBaseUrl(),
  responseType: "json",
  withCredentials: false, // Desktop doesn't need credentials
});

// Setup interceptors for the local backend request boundary.
// Cast to AxiosInstance - Tauri client has compatible API
setupApiInterceptors(apiClient as unknown as AxiosInstance);

// ---------- Install error interceptor ----------
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    recordDiagnosticException("api", "request-failed", error, {
      endpoint: apiErrorEndpoint(error),
    });
    await handleHttpError(error); // Handle error (shows toast unless suppressed)
    return Promise.reject(error);
  },
);

function apiErrorEndpoint(error: unknown): string | undefined {
  if (!error || typeof error !== "object") return undefined;
  const config = (error as { config?: { url?: unknown } }).config;
  return typeof config?.url === "string" ? config.url : undefined;
}

// ---------- Exports ----------
export default apiClient;
