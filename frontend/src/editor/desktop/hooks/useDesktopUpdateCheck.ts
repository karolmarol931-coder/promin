import { useEffect } from "react";
import { isTauri } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { check, type DownloadEvent } from "@tauri-apps/plugin-updater";
import i18n from "@editor/i18n";

const UPDATE_CHECK_INTERVAL_MS = 8 * 60 * 60 * 1000;
const UPDATE_CHECK_TIMEOUT_MS = 20 * 1000;
const UPDATE_DOWNLOAD_TIMEOUT_MS = 2 * 60 * 60 * 1000;

export type DesktopUpdateCheckResult =
  | { status: "up-to-date" }
  | { status: "ready"; version: string }
  | { status: "failed" };

export type DesktopUpdateProgress =
  | { phase: "checking" }
  | {
      phase: "downloading";
      version: string;
      downloadedBytes: number;
      contentLength: number | null;
    }
  | { phase: "installing"; version: string }
  | { phase: "ready"; version: string }
  | { phase: "up-to-date" }
  | { phase: "failed" };

let activeCheck: Promise<DesktopUpdateCheckResult> | null = null;
let preparedUpdateVersion: string | null = null;
let updateProgress: DesktopUpdateProgress | null = null;
const progressListeners = new Set<
  (progress: DesktopUpdateProgress | null) => void
>();

function publishProgress(progress: DesktopUpdateProgress | null): void {
  updateProgress = progress;
  for (const listener of progressListeners) listener(progress);
}

export function subscribeDesktopUpdateProgress(
  listener: (progress: DesktopUpdateProgress | null) => void,
): () => void {
  progressListeners.add(listener);
  listener(updateProgress);
  return () => {
    progressListeners.delete(listener);
  };
}

export async function checkAndInstallUpdate(): Promise<DesktopUpdateCheckResult> {
  if (preparedUpdateVersion) {
    publishProgress({ phase: "ready", version: preparedUpdateVersion });
    return { status: "ready", version: preparedUpdateVersion };
  }
  if (activeCheck) return activeCheck;

  const pendingCheck = (async (): Promise<DesktopUpdateCheckResult> => {
    let update: Awaited<ReturnType<typeof check>> = null;
    publishProgress({ phase: "checking" });

    try {
      update = await check({ timeout: UPDATE_CHECK_TIMEOUT_MS });
      if (!update) {
        publishProgress({ phase: "up-to-date" });
        return { status: "up-to-date" };
      }

      const updateVersion = update.version;
      console.info(`[DesktopUpdater] Downloading Promin ${updateVersion}`);
      let downloadedBytes = 0;
      publishProgress({
        phase: "downloading",
        version: updateVersion,
        downloadedBytes,
        contentLength: null,
      });
      await update.downloadAndInstall(
        (event: DownloadEvent) => {
          if (event.event === "Started") {
            downloadedBytes = 0;
            publishProgress({
              phase: "downloading",
              version: updateVersion,
              downloadedBytes,
              contentLength: event.data.contentLength ?? null,
            });
          } else if (event.event === "Progress") {
            downloadedBytes += event.data.chunkLength;
            if (updateProgress?.phase === "downloading") {
              publishProgress({
                ...updateProgress,
                downloadedBytes,
              });
            }
          } else {
            publishProgress({ phase: "installing", version: updateVersion });
          }
        },
        { timeout: UPDATE_DOWNLOAD_TIMEOUT_MS },
      );
      preparedUpdateVersion = updateVersion;
      publishProgress({ phase: "ready", version: updateVersion });
      return { status: "ready", version: updateVersion };
    } catch (error) {
      console.warn(
        "[DesktopUpdater] Update check or installation failed",
        error,
      );
      publishProgress({ phase: "failed" });
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
          "Restart Promin to install the update.",
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
