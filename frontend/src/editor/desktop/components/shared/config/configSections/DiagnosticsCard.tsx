import { useState } from "react";
import { Group, Paper, Stack, Text } from "@mantine/core";
import { invoke } from "@tauri-apps/api/core";
import { getVersion } from "@tauri-apps/api/app";
import { Button } from "@editor/ui/Button";
import { useTranslation } from "react-i18next";
import { useAppConfig } from "@editor/contexts/AppConfigContext";
import { downloadDiagnosticReport, getDiagnosticEvents, recordDiagnosticException } from "@editor/services/diagnosticLog";

const EXPORT_STATUS_COPY = {
  complete: {
    key: "settings.diagnostics.exported",
    fallback: "Report downloaded. Review it, then send it to your support contact.",
  },
  partial: {
    key: "settings.diagnostics.exportedPartial",
    fallback: "A partial report was downloaded because local service logs could not be included.",
  },
  failed: {
    key: "settings.diagnostics.exportFailed",
    fallback: "The diagnostic report could not be downloaded.",
  },
};

export function DiagnosticsCard() {
  const { t } = useTranslation();
  const { config } = useAppConfig();
  const [exporting, setExporting] = useState(false);
  const [eventCount, setEventCount] = useState(() => getDiagnosticEvents().length);
  const [exportStatus, setExportStatus] = useState<"complete" | "partial" | "failed" | null>(null);

  const exportReport = async () => {
    setExporting(true);
    setExportStatus(null);
    try {
      let nativeLogs: string[] = [];
      let status: "complete" | "partial" = "complete";
      try {
        nativeLogs = await invoke<string[]>("get_tauri_logs");
      } catch (error) {
        recordDiagnosticException("diagnostics", "native-log-export-failed", error);
        status = "partial";
      }
      setEventCount(getDiagnosticEvents().length);
      let desktopVersion = "unknown";
      try {
        desktopVersion = await getVersion();
      } catch (error) {
        recordDiagnosticException("diagnostics", "desktop-version-read-failed", error);
      }
      downloadDiagnosticReport(desktopVersion, nativeLogs, config?.appVersion);
      setExportStatus(status);
    } catch (error) {
      recordDiagnosticException("diagnostics", "report-download-failed", error);
      setExportStatus("failed");
    } finally {
      setExporting(false);
    }
  };

  return (
    <Paper withBorder p="md" radius="md">
      <Stack gap="sm">
        <Text size="sm" c="dimmed">
          {t(
            "settings.diagnostics.description",
            "The report includes recent app and local service logs. Some technical log details may contain private information; review the report before sharing. Nothing is sent automatically.",
          )}
        </Text>
        <Group justify="space-between" align="center">
          <Text size="xs" c="dimmed">
            {t("settings.diagnostics.eventCount", "Saved events")}: {eventCount}
          </Text>
          <Button variant="secondary" size="sm" loading={exporting} disabled={exporting} onClick={exportReport}>
            {t("settings.diagnostics.export", "Export diagnostic report")}
          </Button>
        </Group>
        {exportStatus && (
          <Text size="xs" c={exportStatus === "failed" ? "red" : "teal"} role="status">
            {t(EXPORT_STATUS_COPY[exportStatus].key, EXPORT_STATUS_COPY[exportStatus].fallback)}
          </Text>
        )}
      </Stack>
    </Paper>
  );
}
