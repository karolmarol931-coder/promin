import { beforeEach, describe, expect, it } from "vitest";
import { preferencesService } from "@editor/services/preferencesService";

const PREFERENCES_KEY = "stirlingpdf_preferences";
const APPEARANCE_ROLLOUT_KEY = "stirlingpdf_appearance_rollout_3_2_45";

describe("Seasonal appearance rollout", () => {
  beforeEach(() => {
    localStorage.clear();
    preferencesService.clearServerDefaults();
  });

  it("enables dark mode and the New Year theme on existing installs once", () => {
    localStorage.setItem(
      PREFERENCES_KEY,
      JSON.stringify({
        theme: "light",
        newYearThemeEnabled: false,
        defaultViewerZoom: "125",
      }),
    );

    expect(preferencesService.getAllPreferences()).toMatchObject({
      theme: "dark",
      newYearThemeEnabled: true,
    });
    expect(preferencesService.getPreference("defaultViewerZoom")).toBe("125");
    expect(
      JSON.parse(localStorage.getItem(PREFERENCES_KEY) ?? "{}"),
    ).toMatchObject({
      theme: "dark",
      newYearThemeEnabled: true,
    });
    expect(localStorage.getItem(APPEARANCE_ROLLOUT_KEY)).toBe("complete");

    preferencesService.setPreference("newYearThemeEnabled", false);
    preferencesService.setPreference("theme", "light");

    expect(preferencesService.getAllPreferences()).toMatchObject({
      theme: "light",
      newYearThemeEnabled: false,
    });
  });

  it("uses dark mode and the New Year theme for new installs", () => {
    expect(preferencesService.getAllPreferences()).toMatchObject({
      theme: "dark",
      newYearThemeEnabled: true,
    });
  });
});
