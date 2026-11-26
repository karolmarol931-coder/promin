import { useState } from "react";
import { Group, Paper, Stack, Text } from "@mantine/core";
import { Button } from "@editor/ui/Button";
import { useTranslation } from "react-i18next";
import { useAppConfig } from "@editor/contexts/AppConfigContext";
import {
  downloadDiagnosticReport,
  getDiagnosticEvents,
} from "@editor/services/diagnosticLog";

export function DiagnosticsCard() {
  const { t } = useTranslation();
  const { config } = useAppConfig();
  const [exporting, setExporting] = useState(false);
  const [eventCount, setEventCount] = useState(
    () => getDiagnosticEvents().length,
  );
  const [exported, setExported] = useState(false);

  const exportReport = () => {
    setExporting(true);
    try {
      setEventCount(getDiagnosticEvents().length);
      downloadDiagnosticReport(config?.appVersion ?? "unknown");
      setExported(true);
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
            "Promin keeps a small error history on this computer. The report contains app events and technical error details, not PDF files or form values. Nothing is sent automatically.",
          )}
        </Text>
        <Group justify="space-between" align="center">
          <Text size="xs" c="dimmed">
            {t("settings.diagnostics.eventCount", "Saved events")}: {eventCount}
          </Text>
          <Button
            variant="secondary"
            size="sm"
            loading={exporting}
            disabled={exporting}
            onClick={exportReport}
          >
            {t("settings.diagnostics.export", "Export diagnostic report")}
          </Button>
        </Group>
        {exported && (
          <Text size="xs" c="teal" role="status">
            {t(
              "settings.diagnostics.exported",
              "Report downloaded. Attach it when you send a bug report.",
            )}
          </Text>
        )}
      </Stack>
    </Paper>
  );
}
