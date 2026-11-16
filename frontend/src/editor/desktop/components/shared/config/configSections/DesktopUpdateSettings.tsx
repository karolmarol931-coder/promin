import { useEffect, useState } from "react";
import { getVersion } from "@tauri-apps/api/app";
import { Alert, Group, Stack, Text } from "@mantine/core";
import { Button } from "@editor/ui/Button";
import { useTranslation } from "react-i18next";
import { checkAndInstallUpdate } from "@editor/hooks/useDesktopUpdateCheck";
import { SettingsCard } from "@editor/components/shared/config/SettingsCard";

type UpdateStatus = "idle" | "checking" | "up-to-date" | "ready" | "failed";

export function DesktopUpdateSettings() {
  const { t } = useTranslation();
  const [version, setVersion] = useState<string | null>(null);
  const [availableVersion, setAvailableVersion] = useState<string | null>(null);
  const [status, setStatus] = useState<UpdateStatus>("idle");

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

  const checkForUpdates = async () => {
    setStatus("checking");
    const result = await checkAndInstallUpdate();
    if (result.status === "ready") setAvailableVersion(result.version);
    setStatus(result.status);
  };

  const statusMessage = {
    idle: "",
    checking: t("desktop.updates.checking", "Checking for updates…"),
    "up-to-date": t(
      "desktop.updates.upToDateVersion",
      "You have the latest version of Promin ({{version}}).",
      { version: version ?? "" },
    ),
    ready: t(
      "desktop.updates.readyVersion",
      "Version {{version}} is ready and will be active the next time you open Promin.",
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
            onClick={() => void checkForUpdates()}
          >
            {status === "checking"
              ? t("desktop.updates.checking", "Checking for updates…")
              : t("desktop.updates.checkNow", "Check for updates")}
          </Button>
        </Group>
        {statusMessage && (
          <Alert
            color={statusColor}
            variant="light"
            title={
              status === "checking"
                ? t("desktop.updates.checkingTitle", "Checking for updates")
                : status === "up-to-date"
                  ? t("desktop.updates.upToDateTitle", "No update available")
                  : status === "ready"
                    ? t("desktop.updates.readyTitle", "Update ready")
                    : t("desktop.updates.checkFailedTitle", "Update check failed")
            }
            aria-live="polite"
          >
            <Text size="sm">{statusMessage}</Text>
          </Alert>
        )}
      </Stack>
    </SettingsCard>
  );
}
