// @vitest-environment node
import React from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("react-router-dom", () => ({
  useNavigate: vi.fn(),
}));

vi.mock("@editor/contexts/ToolWorkflowContext", () => ({
  useToolWorkflow: vi.fn(),
}));

vi.mock("@editor/contexts/NavigationContext", () => ({
  useNavigationActions: vi.fn(),
}));

vi.mock("@editor/contexts/ViewerContext", () => ({
  ViewerContext: React.createContext(null),
}));

vi.mock("@editor/contexts/AppConfigContext", () => ({
  useAppConfig: vi.fn(),
}));

vi.mock("@editor/contexts/file/fileHooks", () => ({
  useFileActions: vi.fn(),
}));

vi.mock("@editor/auth/UseSession", () => ({
  useAuth: vi.fn(() => ({
    isAdmin: false,
    role: null,
  })),
}));

vi.mock("@editor/services/fileStorage", () => ({
  fileStorage: {
    getLeafStirlingFileStubs: vi.fn(),
  },
}));

vi.mock("@editor/data/settingsSearchIndex", () => ({
  SETTINGS_SEARCH_INDEX: [
    {
      section: "email",
      anchor: "smtp-host",
      labelKey: "settings.email.smtpHost",
      labelFallback: "SMTP host",
      keywords: ["smtp"],
    },
  ],
}));

vi.mock("@editor/data/settingsSectionRegistry", () => ({
  SETTINGS_SECTION_REGISTRY: [
    {
      key: "general",
      labelKey: "settings.general.title",
      labelFallback: "General",
      keywords: ["general"],
    },
    {
      key: "email",
      labelKey: "settings.email.title",
      labelFallback: "Email",
      keywords: ["mail"],
      requiresLogin: true,
    },
    {
      key: "admin",
      labelKey: "settings.admin.title",
      labelFallback: "Admin",
      keywords: ["admin"],
      adminArea: true,
    },
    {
      key: "teams",
      labelKey: "settings.teams.title",
      labelFallback: "Team",
      keywords: ["team"],
      requiresAccount: true,
    },
  ],
}));

vi.mock("@editor/data/settingsContentSearch", () => ({
  findSettingsContentMatch: vi.fn((section: string, query: string) => {
    if (query === "smtp" && (section === "general" || section === "email")) {
      return { section, query };
    }
    return null;
  }),
  buildMatchSnippet: vi.fn(
    (_match: unknown, query: string) => `Match: ${query}`,
  ),
}));

import type { TFunction } from "i18next";
import {
  assembleSuperSearchGroups,
  rankSettingsResults,
} from "@editor/hooks/useSuperSearch";

const t = ((key: string, fallback?: string) =>
  fallback ?? key) as unknown as TFunction;

describe("useSuperSearch helpers", () => {
  it("drops empty groups and preserves the requested group order", () => {
    const groups = assembleSuperSearchGroups(
      {
        tools: [
          {
            key: "tool:rotate",
            group: "tools",
            title: "Rotate",
            score: 60,
            onSelect: vi.fn(),
          },
        ],
      },
      t,
      ["tools", "settings", "files"],
    );

    expect(groups.map((group) => group.id)).toEqual(["tools"]);
    expect(groups.map((group) => group.label)).toEqual(["Tools"]);
  });

  it("prefers row-level setting hits and skips duplicate content matches", () => {
    const openSettings = vi.fn();

    const results = rankSettingsResults(
      "smtp",
      t,
      {
        isAdmin: false,
        loginEnabled: true,
      },
      openSettings,
    );

    expect(results.map((result) => result.key)).toEqual([
      "setting:email:smtp-host",
      "setting-content:general",
    ]);

    void results[0]?.onSelect();
    expect(openSettings).toHaveBeenCalledWith("email", "smtp-host");
  });

  it("keeps gated settings hidden while app config is unresolved", () => {
    const results = rankSettingsResults("admin", t, null, vi.fn());

    expect(results).toEqual([]);
    expect(rankSettingsResults("team", t, null, vi.fn())).toEqual([]);
  });

  it("respects showSettingsWhenNoLogin for the no-login admin preview", () => {
    const noLoginGates = { isAdmin: false, loginEnabled: false };

    // Default (flag unset / true): no-login mode keeps the admin preview.
    const shown = rankSettingsResults("admin", t, noLoginGates, vi.fn());
    expect(shown.map((result) => result.key)).toEqual([
      "setting-section:admin",
    ]);

    // Flag off: the modal hides admin sections, so search must too.
    const hidden = rankSettingsResults(
      "admin",
      t,
      { ...noLoginGates, showSettingsWhenNoLogin: false },
      vi.fn(),
    );
    expect(hidden).toEqual([]);

    // Admins keep admin sections regardless of the flag.
    const admin = rankSettingsResults(
      "admin",
      t,
      { isAdmin: true, loginEnabled: true, showSettingsWhenNoLogin: false },
      vi.fn(),
    );
    expect(admin.map((result) => result.key)).toEqual([
      "setting-section:admin",
    ]);
  });

  it("hides account-bound settings from anonymous sessions", () => {
    const anonymous = rankSettingsResults(
      "team",
      t,
      { isAdmin: false, loginEnabled: true, isAnonymous: true },
      vi.fn(),
    );
    expect(anonymous).toEqual([]);

    const signedIn = rankSettingsResults(
      "team",
      t,
      { isAdmin: false, loginEnabled: true, isAnonymous: false },
      vi.fn(),
    );
    expect(signedIn.map((result) => result.key)).toEqual([
      "setting-section:teams",
    ]);

    // A caller without session details keeps the section visible.
    const flagless = rankSettingsResults(
      "team",
      t,
      { isAdmin: false, loginEnabled: true },
      vi.fn(),
    );
    expect(flagless.map((result) => result.key)).toEqual([
      "setting-section:teams",
    ]);
  });
});
