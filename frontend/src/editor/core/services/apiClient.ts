import axios from "axios";
import { handleHttpError } from "@editor/services/httpErrorHandler";
import { setupApiInterceptors } from "@editor/services/apiClientSetup";
import { getApiBaseUrl } from "@editor/services/apiClientConfig";
import { recordDiagnosticException } from "@editor/services/diagnosticLog";

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: getApiBaseUrl(),
  responseType: "json",
  withCredentials: true,
});

// Setup interceptors (core does nothing, proprietary adds JWT auth)
setupApiInterceptors(apiClient);

// ---------- Install error interceptor ----------
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    recordDiagnosticException("api", "request-failed", error, {
      endpoint: axios.isAxiosError(error) ? error.config?.url : undefined,
    });
    await handleHttpError(error); // Handle error (shows toast unless suppressed)
    return Promise.reject(error);
  },
);

// ---------- Exports ----------
export default apiClient;
