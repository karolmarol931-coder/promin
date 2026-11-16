import i18n from "@editor/i18n";
import { alert } from "@editor/components/toast";
import { tauriBackendService } from "@editor/services/tauriBackendService";

const BACKEND_TOAST_COOLDOWN_MS = 4000;
let lastBackendToast = 0;

export async function ensureBackendReady(_endpoint?: string): Promise<boolean> {
  if (tauriBackendService.isOnline) return true;

  await tauriBackendService.checkBackendHealth();
  if (tauriBackendService.isOnline) return true;

  const now = Date.now();
  if (now - lastBackendToast > BACKEND_TOAST_COOLDOWN_MS) {
    lastBackendToast = now;
    alert({
      alertType: "error",
      title: i18n.t("backendHealth.offline", "Backend Offline"),
      body: i18n.t(
        "backendHealth.checking",
        "Checking local backend status...",
      ),
      isPersistentPopup: false,
    });
  }

  return false;
}
