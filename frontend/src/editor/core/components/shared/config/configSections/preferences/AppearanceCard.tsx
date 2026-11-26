import { Paper, Stack, Switch, Text } from "@mantine/core";
import { useId } from "react";
import { InfoTooltip } from "@editor/ui/InfoTooltip";
import { useTranslation } from "react-i18next";
import { SegmentedControl } from "@editor/ui/SegmentedControl";
import { usePreferences } from "@editor/contexts/PreferencesContext";
import { useTheme } from "@editor/components/shared/ThemeProvider";
import LanguageSelector from "@editor/components/shared/LanguageSelector";

/** How the app looks: theme and display language. Both write through at once. */
export function AppearanceCard() {
  const { t } = useTranslation();
  const { setTheme, themeMode } = useTheme();
  const { preferences, updatePreference } = usePreferences();
  const newYearThemeLabelId = useId();

  return (
    <Paper withBorder p="md" radius="md">
      <Stack gap="md">
        <div
          id="setting-theme"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <Text fw={500} size="sm">
              {t("settings.general.theme", "Theme")}{" "}
              <InfoTooltip
                label={t(
                  "settings.general.themeDescription",
                  "Choose light, dark, or follow your system so it switches automatically.",
                )}
              />
            </Text>
          </div>
          <SegmentedControl
            value={themeMode}
            onChange={(val) => setTheme(val)}
            options={[
              {
                label: t("settings.general.themeLight", "Light"),
                value: "light",
              },
              {
                label: t("settings.general.themeDark", "Dark"),
                value: "dark",
              },
              {
                label: t("settings.general.themeSystem", "System"),
                value: "system",
              },
            ]}
          />
        </div>
        <div
          id="setting-new-year-theme"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "1rem",
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <Text id={newYearThemeLabelId} fw={500} size="sm">
              {t("settings.general.newYearTheme", "New Year theme")}
            </Text>
            <Text c="dimmed" size="xs" mt={3}>
              {t(
                "settings.general.newYearThemeDescription",
                "Gentle snowfall, winter colours and a festive welcome screen.",
              )}
            </Text>
          </div>
          <Switch
            aria-labelledby={newYearThemeLabelId}
            checked={preferences.newYearThemeEnabled}
            onChange={(event) =>
              updatePreference(
                "newYearThemeEnabled",
                event.currentTarget.checked,
              )
            }
          />
        </div>
        <div
          id="setting-language"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <Text fw={500} size="sm">
              {t("settings.general.language", "Language")}{" "}
              <InfoTooltip
                label={t(
                  "settings.general.languageDescription",
                  "Choose the display language",
                )}
              />
            </Text>
          </div>
          <LanguageSelector position="bottom-end" offset={6} />
        </div>
      </Stack>
    </Paper>
  );
}
