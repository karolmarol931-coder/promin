import { useState } from "react";
import { Group, Paper, Stack, Text } from "@mantine/core";
import { open } from "@tauri-apps/plugin-dialog";
import { Button } from "@editor/ui/Button";
import { usePreferences } from "@editor/contexts/PreferencesContext";
import { useTranslation } from "react-i18next";

export function DefaultSaveLocationSettings() {
  const { t } = useTranslation();
  const { preferences, updatePreference } = usePreferences();
  const [isChoosing, setIsChoosing] = useState(false);

  const chooseDirectory = async () => {
    setIsChoosing(true);
    try {
      const selectedDirectory = await open({
        directory: true,
        multiple: false,
        defaultPath: preferences.defaultSaveDirectory || undefined,
        title: t("settings.general.chooseSaveLocation", "Choose folder"),
      });
      if (typeof selectedDirectory === "string") {
        updatePreference("defaultSaveDirectory", selectedDirectory);
      }
    } catch (error) {
      console.error("[DefaultSaveLocation] Could not choose folder", error);
    } finally {
      setIsChoosing(false);
    }
  };

  return (
    <Paper withBorder p="md" radius="md">
      <Stack gap="sm">
        <Group justify="space-between" align="center">
          <div style={{ minWidth: 0 }}>
            <Text fw={500} size="sm">
              {t("settings.general.defaultSaveLocation", "Default save folder")}
            </Text>
            <Text
              size="xs"
              c="dimmed"
              mt={4}
              style={{ overflowWrap: "anywhere" }}
            >
              {preferences.defaultSaveDirectory ||
                t(
                  "settings.general.defaultSaveLocationUnset",
                  "Ask where to save each file",
                )}
            </Text>
          </div>
          <Group gap="xs" wrap="nowrap">
            <Button
              variant="secondary"
              size="sm"
              loading={isChoosing}
              disabled={isChoosing}
              onClick={() => void chooseDirectory()}
            >
              {t("settings.general.chooseSaveLocation", "Choose folder")}
            </Button>
            {preferences.defaultSaveDirectory && (
              <Button
                variant="tertiary"
                size="sm"
                onClick={() => updatePreference("defaultSaveDirectory", "")}
              >
                {t("settings.general.clearSaveLocation", "Clear")}
              </Button>
            )}
          </Group>
        </Group>
      </Stack>
    </Paper>
  );
}
