import type { AxiosInstance, InternalAxiosRequestConfig } from "axios";
import { alert } from "@editor/components/toast";
import { setupApiInterceptors as coreSetup } from "@editor-core/services/apiClientSetup";
import { tauriBackendService } from "@editor/services/tauriBackendService";
import { createBackendNotReadyError } from "@editor/constants/backendErrors";
import { operationRouter } from "@editor/services/operationRouter";
import i18n from "@editor/i18n";

interface DesktopRequestConfig extends InternalAxiosRequestConfig {
  endpointName?: string;
  skipBackendReadyCheck?: boolean;
  suppressErrorToast?: boolean;
}

export async function getAuthHeaders(): Promise<Record<string, string>> {
  return {};
}

const BACKEND_TOAST_COOLDOWN_MS = 4000;
let lastBackendToast = 0;

export function setupApiInterceptors(client: AxiosInstance): void {
  coreSetup(client);

  client.interceptors.request.use(async (config) => {
    const desktopConfig = config as DesktopRequestConfig;
    const originalUrl = desktopConfig.url ?? "";
    const baseUrl = await operationRouter.getBaseUrl(
      originalUrl,
      desktopConfig.endpointName,
    );

    if (originalUrl && !/^(?:https?:)?\/\//i.test(originalUrl)) {
      desktopConfig.url = `${baseUrl}${originalUrl}`;
    }
    desktopConfig.withCredentials = false;

    if (!desktopConfig.skipBackendReadyCheck && !tauriBackendService.isOnline) {
      const method = (desktopConfig.method ?? "get").toLowerCase();
      if (method !== "get") {
        const now = Date.now();
        if (now - lastBackendToast > BACKEND_TOAST_COOLDOWN_MS) {
          lastBackendToast = now;
          alert({
            alertType: "error",
            title: i18n.t("backendHealth.offline", "Backend Offline"),
            body: i18n.t(
              "backendHealth.wait",
              "Please wait for the local backend to finish starting and try again.",
            ),
            isPersistentPopup: false,
          });
        }
      }
      return Promise.reject(createBackendNotReadyError());
    }

    return desktopConfig;
  });
}
