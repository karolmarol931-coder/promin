import { useState, type ReactNode } from "react";
import { InfoTooltip } from "@editor/ui/InfoTooltip";
import { useTranslation } from "react-i18next";
import {
  TextInput,
  NumberInput,
  Radio,
  Stack,
  Paper,
  Text,
  Group,
} from "@mantine/core";
import { alert } from "@editor/components/toast";
import PendingBadge from "@editor/components/shared/config/PendingBadge";
import apiClient from "@editor/services/apiClient";
import { Button } from "@editor/ui/Button";
import type { AiCardProps } from "@editor/components/shared/config/configSections/ai/aiCardProps";
import "@editor/components/shared/config/configSections/ai/AiModeOption.css";

type AiMode = "off" | "self";

interface ModeOptionProps {
  mode: AiMode;
  selected: AiMode;
  title: string;
  description: string;
  onSelect: (mode: AiMode) => void;
  badge?: ReactNode;
  children?: ReactNode;
}

/**
 * One row of the mode chooser. A real radio, so the group is arrow-navigable and screen readers
 * announce it as a choice rather than three unrelated switches.
 */
function ModeOption({
  mode,
  selected,
  title,
  description,
  onSelect,
  badge,
  children,
}: ModeOptionProps) {
  const active = selected === mode;
  return (
    <Paper
      withBorder
      p="md"
      radius="md"
      className={["ai-mode-option", active ? "ai-mode-option--selected" : ""]
        .filter(Boolean)
        .join(" ")}
      // Clicking anywhere on the card picks the mode; the radio stays the real control, so
      // keyboard and screen readers are unaffected.
      onClick={() => onSelect(mode)}
    >
      <Group gap="sm" align="flex-start" wrap="nowrap">
        <Radio
          value={mode}
          checked={active}
          onChange={() => onSelect(mode)}
          aria-label={title}
          mt={2}
        />
        <div style={{ flexGrow: 1, minWidth: 0 }}>
          <Group gap="xs" align="center" wrap="nowrap">
            <Text fw={600} size="sm">
              {title}
            </Text>
            {badge}
          </Group>
          <Text size="sm" c="dimmed" mt={2}>
            {description}
          </Text>
          {active && children ? (
            <div className="ai-mode-option__body">{children}</div>
          ) : null}
        </div>
      </Group>
    </Paper>
  );
}

/**
 * Where AI runs, and - for a self-hosted engine - how to reach it.
 *
 * The engine fields sit under the option that owns them. Every key here is restart-required.
 */
export function AiConnectionCard({
  settings,
  setSettings,
  isFieldPending,
}: AiCardProps) {
  const { t } = useTranslation();
  const [testingConnection, setTestingConnection] = useState(false);
  const enabled = settings.enabled || false;
  const mode: AiMode = enabled ? "self" : "off";

  const selectMode = (next: AiMode) => {
    setSettings({
      ...settings,
      enabled: next !== "off",
      mode: "SELF_HOSTED",
    });
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    try {
      await apiClient.get("/api/v1/ai/health");
      alert({
        alertType: "success",
        title: t(
          "admin.settings.ai.general.test.okTitle",
          "AI engine reachable",
        ),
        body: t(
          "admin.settings.ai.general.test.okBody",
          "The AI engine responded to a health check.",
        ),
      });
    } catch (error) {
      const detail =
        (error as { response?: { data?: { message?: string } } })?.response
          ?.data?.message ||
        t(
          "admin.settings.ai.general.test.failBody",
          "The AI engine did not respond. Check the URL, that the engine container is running, and that AI is enabled (a restart is needed after enabling).",
        );
      alert({
        alertType: "error",
        title: t(
          "admin.settings.ai.general.test.failTitle",
          "AI engine unreachable",
        ),
        body: detail,
      });
    } finally {
      setTestingConnection(false);
    }
  };

  return (
    <Radio.Group
      value={mode}
      onChange={(value) => selectMode(value as AiMode)}
      aria-label={t("admin.settings.ai.general.mode.label", "Local AI engine")}
    >
      <Stack gap="sm">
        <ModeOption
          mode="off"
          selected={mode}
          onSelect={selectMode}
          title={t("admin.settings.ai.general.mode.off.title", "Off")}
          description={t(
            "admin.settings.ai.general.mode.off.description",
            "No AI tools anywhere in the app, and nothing leaves this server.",
          )}
        />

        <ModeOption
          mode="self"
          selected={mode}
          onSelect={selectMode}
          title={t(
            "admin.settings.ai.general.mode.self.title",
            "Run your own engine",
          )}
          description={t(
            "admin.settings.ai.general.mode.self.description",
            "A container you host, pointed at a model provider of your choosing. Your key, your bill, your data path.",
          )}
          badge={<PendingBadge show={isFieldPending("enabled")} />}
        >
          <Stack gap="sm">
            <TextInput
              label={
                <Group gap="xs">
                  <span>
                    {t("admin.settings.ai.general.url.label", "AI engine URL")}
                  </span>
                  <PendingBadge show={isFieldPending("url")} />
                  <InfoTooltip
                    label={t(
                      "admin.settings.ai.general.url.description",
                      "Local URL of the Python AI engine, e.g. http://127.0.0.1:5001.",
                    )}
                  />
                </Group>
              }
              value={settings.url || ""}
              onChange={(e) =>
                setSettings({ ...settings, url: e.target.value })
              }
              placeholder="http://127.0.0.1:5001"
            />

            <Group
              gap="sm"
              grow
              align="flex-start"
              style={{ alignItems: "flex-start" }}
            >
              <NumberInput
                label={
                  <Group gap="xs">
                    <span>
                      {t(
                        "admin.settings.ai.general.timeoutSeconds.label",
                        "Request timeout (seconds)",
                      )}
                    </span>
                    <PendingBadge show={isFieldPending("timeoutSeconds")} />
                    <InfoTooltip
                      label={t(
                        "admin.settings.ai.general.timeoutSeconds.description",
                        "Timeout for standard AI requests to the engine.",
                      )}
                    />
                  </Group>
                }
                value={settings.timeoutSeconds ?? 0}
                onChange={(value) =>
                  setSettings({ ...settings, timeoutSeconds: Number(value) })
                }
                min={1}
              />

              <NumberInput
                label={
                  <Group gap="xs">
                    <span>
                      {t(
                        "admin.settings.ai.general.longRunningTimeoutSeconds.label",
                        "Long-running timeout (seconds)",
                      )}
                    </span>
                    <PendingBadge
                      show={isFieldPending("longRunningTimeoutSeconds")}
                    />
                    <InfoTooltip
                      label={t(
                        "admin.settings.ai.general.longRunningTimeoutSeconds.description",
                        "Timeout for heavier agent operations such as document generation.",
                      )}
                    />
                  </Group>
                }
                value={settings.longRunningTimeoutSeconds ?? 0}
                onChange={(value) =>
                  setSettings({
                    ...settings,
                    longRunningTimeoutSeconds: Number(value),
                  })
                }
                min={1}
              />

              <NumberInput
                label={
                  <Group gap="xs">
                    <span>
                      {t(
                        "admin.settings.ai.general.streamTimeoutSeconds.label",
                        "Stream timeout (seconds)",
                      )}
                    </span>
                    <PendingBadge
                      show={isFieldPending("streamTimeoutSeconds")}
                    />
                    <InfoTooltip
                      label={t(
                        "admin.settings.ai.general.streamTimeoutSeconds.description",
                        "Timeout for streamed (token-by-token) chat responses.",
                      )}
                    />
                  </Group>
                }
                value={settings.streamTimeoutSeconds ?? 0}
                onChange={(value) =>
                  setSettings({
                    ...settings,
                    streamTimeoutSeconds: Number(value),
                  })
                }
                min={1}
              />
            </Group>

            <Group justify="space-between" align="center">
              <Text size="xs" c="dimmed">
                {t(
                  "admin.settings.ai.general.restartNote",
                  "Changing the URL or any timeout takes effect after a restart.",
                )}
              </Text>
              <Button
                variant="secondary"
                size="sm"
                loading={testingConnection}
                onClick={handleTestConnection}
              >
                {t("admin.settings.ai.general.test.button", "Test connection")}
              </Button>
            </Group>
          </Stack>
        </ModeOption>
      </Stack>
    </Radio.Group>
  );
}
