import { useEffect, useState } from "react";
import { getVersion } from "@tauri-apps/api/app";
import { relaunch } from "@tauri-apps/plugin-process";
import { Alert, Group, Stack, Text } from "@mantine/core";
import { Button } from "@editor/ui/Button";
import { useTranslation } from "react-i18next";
import {
  checkAndInstallUpdate,
  subscribeDesktopUpdateProgress,
  type DesktopUpdateProgress,
} from "@editor/hooks/useDesktopUpdateCheck";
import { SettingsCard } from "@editor/components/shared/config/SettingsCard";
import classes from "./DesktopUpdateSettings.module.css";

type UpdateStatus = "idle" | "checking" | "up-to-date" | "ready" | "failed";

export function DesktopUpdateSettings() {
  const { t } = useTranslation();
  const [version, setVersion] = useState<string | null>(null);
  const [availableVersion, setAvailableVersion] = useState<string | null>(null);
  const [status, setStatus] = useState<UpdateStatus>("idle");
  const [updateProgress, setUpdateProgress] =
    useState<DesktopUpdateProgress | null>(null);
  const [isRestarting, setIsRestarting] = useState(false);
  const [restartError, setRestartError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void getVersion()
      .then((value) => {
        if (active) setVersion(value);
      })
      .catch((error) => {
        console.warn("[DesktopUpdater] Could not read Promin version", error);
        if (active) setVersion("");
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(
    () =>
      subscribeDesktopUpdateProgress((progress) => {
        setUpdateProgress(progress);
        if (progress?.phase === "ready") {
          setAvailableVersion(progress.version);
          setStatus("ready");
        } else if (progress?.phase === "up-to-date") {
          setStatus("up-to-date");
        } else if (progress?.phase === "failed") {
          setStatus("failed");
        } else if (progress) {
          setStatus("checking");
        }
      }),
    [],
  );

  const checkForUpdates = async () => {
    setRestartError(null);
    setStatus("checking");
    const result = await checkAndInstallUpdate();
    if (result.status === "ready") setAvailableVersion(result.version);
    setStatus(result.status);
  };

  const restartAndInstall = async () => {
    setIsRestarting(true);
    setRestartError(null);
    try {
      await relaunch();
    } catch (error) {
      console.error("[DesktopUpdater] Could not restart Promin", error);
      setRestartError(
        t(
          "desktop.updates.restartFailed",
          "Could not restart Promin. Close and reopen the app to install the update.",
        ),
      );
      setIsRestarting(false);
    }
  };

  const updatePhaseMessage = (() => {
    if (!updateProgress) return "";
    if (updateProgress.phase === "checking") {
      return t("desktop.updates.checking", "Checking for updates…");
    }
    if (updateProgress.phase === "downloading") {
      return t(
        "desktop.updates.downloading",
        "Downloading version {{version}}…",
        { version: updateProgress.version },
      );
    }
    if (updateProgress.phase === "installing") {
      return t("desktop.updates.installing", "Preparing the update…");
    }
    return "";
  })();
  const progressPercent =
    updateProgress?.phase === "downloading" &&
    updateProgress.contentLength !== null &&
    updateProgress.contentLength > 0
      ? Math.min(
          100,
          Math.round(
            (updateProgress.downloadedBytes / updateProgress.contentLength) *
              100,
          ),
        )
      : null;

  const statusMessage = {
    idle: "",
    checking: "",
    "up-to-date": t(
      "desktop.updates.upToDateVersion",
      "You have the latest version of Promin ({{version}}).",
      { version: version ?? "" },
    ),
    ready: t(
      "desktop.updates.readyVersion",
      "Version {{version}} is ready. Restart Promin to install it.",
      { version: availableVersion ?? "" },
    ),
    failed: t(
      "desktop.updates.checkFailed",
      "Could not check for updates. You can keep using this version.",
    ),
  }[status];
  const statusColor = {
    idle: "gray",
    checking: "gray",
    "up-to-date": "green",
    ready: "blue",
    failed: "red",
  }[status];

  return (
    <SettingsCard
      id="desktop-updates"
      title={t("desktop.updates.label", "Updates and version")}
      description={t(
        "desktop.updates.description",
        "View the installed version and check for Promin updates.",
      )}
    >
      <Stack gap="md">
        <Group justify="space-between" align="center">
          <div>
            <Text fw={500} size="sm">
              {t("desktop.updates.installedVersion", "Installed version")}
            </Text>
            <Text size="sm" c="dimmed" mt={4}>
              {version === null
                ? t("desktop.updates.loadingVersion", "Loading…")
                : version ||
                  t("desktop.updates.versionUnavailable", "Unavailable")}
            </Text>
          </div>
          <Button
            variant="secondary"
            size="sm"
            loading={status === "checking"}
            disabled={status === "checking"}
            aria-busy={status === "checking"}
            onClick={() => void checkForUpdates()}
          >
            {t("desktop.updates.checkNow", "Check for updates")}
          </Button>
        </Group>
        {(statusMessage || status === "checking") && (
          <Alert
            color={statusColor}
            variant="light"
            title={
              status === "checking" && updateProgress?.phase === "downloading"
                ? t("desktop.updates.downloadingTitle", "Downloading update")
                : status === "checking" &&
                    updateProgress?.phase === "installing"
                  ? t("desktop.updates.installingTitle", "Preparing update")
                  : status === "checking"
                    ? t("desktop.updates.checkingTitle", "Checking for updates")
                    : status === "up-to-date"
                      ? t(
                          "desktop.updates.upToDateTitle",
                          "No update available",
                        )
                      : status === "ready"
                        ? t("desktop.updates.readyTitle", "Update ready")
                        : t(
                            "desktop.updates.checkFailedTitle",
                            "Update check failed",
                          )
            }
            aria-live="polite"
          >
            {statusMessage && <Text size="sm">{statusMessage}</Text>}
            {status === "checking" && (
              <Stack gap={4} mt="sm">
                <Text size="xs" c="dimmed" aria-live="polite">
                  {updatePhaseMessage}
                  {progressPercent !== null &&
                    ` ${t("desktop.updates.downloadProgress", "{{percent}}%", { percent: progressPercent })}`}
                </Text>
                <div
                  className={classes.progressTrack}
                  role="progressbar"
                  aria-label={updatePhaseMessage}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={progressPercent ?? undefined}
                  aria-valuetext={
                    progressPercent === null
                      ? updatePhaseMessage
                      : `${progressPercent}%`
                  }
                >
                  <div
                    className={classes.progressFill}
                    data-indeterminate={progressPercent === null}
                    style={
                      progressPercent === null
                        ? undefined
                        : { width: `${progressPercent}%` }
                    }
                  />
                </div>
              </Stack>
            )}
          </Alert>
        )}
        {status === "ready" && (
          <Button
            fullWidth
            loading={isRestarting}
            disabled={isRestarting}
            onClick={() => void restartAndInstall()}
          >
            {isRestarting
              ? t("desktop.updates.restarting", "Restarting Promin…")
              : t("desktop.updates.restartAndInstall", "Restart and install")}
          </Button>
        )}
        {restartError && (
          <Alert color="red" variant="light" aria-live="assertive">
            <Text size="sm">{restartError}</Text>
          </Alert>
        )}
      </Stack>
    </SettingsCard>
  );
}
