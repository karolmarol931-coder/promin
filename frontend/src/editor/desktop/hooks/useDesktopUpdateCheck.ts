import { useEffect } from "react";
import { isTauri } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { check } from "@tauri-apps/plugin-updater";
import i18n from "@editor/i18n";

const UPDATE_CHECK_INTERVAL_MS = 8 * 60 * 60 * 1000;
const UPDATE_CHECK_TIMEOUT_MS = 20 * 1000;
const UPDATE_DOWNLOAD_TIMEOUT_MS = 2 * 60 * 60 * 1000;

let activeCheck: Promise<void> | null = null;

async function checkAndInstallUpdate(): Promise<void> {
  if (activeCheck) return activeCheck;

  activeCheck = (async () => {
    let update: Awaited<ReturnType<typeof check>> = null;

    try {
      update = await check({ timeout: UPDATE_CHECK_TIMEOUT_MS });
      if (!update) return;

      console.info(`[DesktopUpdater] Downloading Promin ${update.version}`);
      await update.downloadAndInstall(undefined, {
        timeout: UPDATE_DOWNLOAD_TIMEOUT_MS,
      });

      void import("@editor/components/toast")
        .then(({ alert }) =>
          alert({
            alertType: "neutral",
            title: i18n.t("desktop.updates.readyTitle", "Update ready"),
            body: i18n.t(
              "desktop.updates.readyBody",
              "The new version will be active the next time you open Promin.",
            ),
            durationMs: 8000,
            expandable: false,
          }),
        )
        .catch((error) => {
          console.warn("[DesktopUpdater] Could not show update toast", error);
        });
    } catch (error) {
      console.warn(
        "[DesktopUpdater] Update check or installation failed",
        error,
      );
    } finally {
      if (update) {
        await update.close().catch((error) => {
          console.warn(
            "[DesktopUpdater] Could not release update resource",
            error,
          );
        });
      }
    }
  })().finally(() => {
    activeCheck = null;
  });

  return activeCheck;
}

export function useDesktopUpdateCheck(): void {
  useEffect(() => {
    if (!isTauri() || getCurrentWindow().label !== "main") return;

    void checkAndInstallUpdate();
    const interval = window.setInterval(
      () => void checkAndInstallUpdate(),
      UPDATE_CHECK_INTERVAL_MS,
    );

    return () => window.clearInterval(interval);
  }, []);
}
