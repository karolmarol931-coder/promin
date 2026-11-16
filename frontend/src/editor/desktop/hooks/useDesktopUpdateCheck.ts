import { useEffect } from "react";
import { isTauri } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { check } from "@tauri-apps/plugin-updater";
import i18n from "@editor/i18n";

const UPDATE_CHECK_INTERVAL_MS = 8 * 60 * 60 * 1000;
const UPDATE_CHECK_TIMEOUT_MS = 20 * 1000;
const UPDATE_DOWNLOAD_TIMEOUT_MS = 2 * 60 * 60 * 1000;

export type DesktopUpdateCheckResult =
  | { status: "up-to-date" }
  | { status: "ready"; version: string }
  | { status: "failed" };

let activeCheck: Promise<DesktopUpdateCheckResult> | null = null;
let preparedUpdateVersion: string | null = null;

export async function checkAndInstallUpdate(): Promise<DesktopUpdateCheckResult> {
  if (preparedUpdateVersion) {
    return { status: "ready", version: preparedUpdateVersion };
  }
  if (activeCheck) return activeCheck;

  const pendingCheck = (async (): Promise<DesktopUpdateCheckResult> => {
    let update: Awaited<ReturnType<typeof check>> = null;

    try {
      update = await check({ timeout: UPDATE_CHECK_TIMEOUT_MS });
      if (!update) return { status: "up-to-date" };

      console.info(`[DesktopUpdater] Downloading Promin ${update.version}`);
      await update.downloadAndInstall(undefined, {
        timeout: UPDATE_DOWNLOAD_TIMEOUT_MS,
      });
      preparedUpdateVersion = update.version;
      return { status: "ready", version: update.version };
    } catch (error) {
      console.warn(
        "[DesktopUpdater] Update check or installation failed",
        error,
      );
      return { status: "failed" };
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
  })();
  const sharedCheck = pendingCheck.finally(() => {
    activeCheck = null;
  });
  activeCheck = sharedCheck;

  return sharedCheck;
}

async function notifyUpdateReady(): Promise<void> {
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
}

export function useDesktopUpdateCheck(): void {
  useEffect(() => {
    if (!isTauri() || getCurrentWindow().label !== "main") return;

    let notifiedVersion: string | null = null;
    const checkForUpdate = () => {
      void checkAndInstallUpdate().then((result) => {
        if (result.status !== "ready" || result.version === notifiedVersion) {
          return;
        }
        notifiedVersion = result.version;
        void notifyUpdateReady();
      });
    };

    checkForUpdate();
    const interval = window.setInterval(
      checkForUpdate,
      UPDATE_CHECK_INTERVAL_MS,
    );

    return () => window.clearInterval(interval);
  }, []);
}
