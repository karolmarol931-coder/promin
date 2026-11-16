import type React from "react";
import type { IconName } from "@editor/ui/Icon";

/**
 * Shared result and scope contracts for the editor's search provider.
 */

export type SuperSearchGroupId = "files" | "tools" | "settings";

export interface SuperSearchResult {
  /** Stable unique key across all groups. */
  key: string;
  /** Group id — the editor uses SuperSearchGroupId; other hosts use their own. */
  group: string;
  title: string;
  subtitle?: string;
  /** Registry icon name (files/settings); tools provide a node via `icon`. */
  iconName?: IconName;
  icon?: React.ReactNode;
  score: number;
  onSelect: () => void | Promise<void>;
}

export interface SuperSearchGroup {
  id: string;
  label: string;
  /** Optional higher-level section label rendered above consecutive groups. */
  sectionLabel?: string;
  results: SuperSearchResult[];
}

export interface SuperSearchScope {
  id: string;
  label: string;
  aliases?: string[];
}

export interface UseSuperSearchResult {
  /** Non-empty groups, in display order. */
  groups: SuperSearchGroup[];
  /** All results flattened in display order (for keyboard navigation). */
  flatResults: SuperSearchResult[];
  /** True while the My Files store is loading for the first time. */
  loadingFiles: boolean;
}

export interface SuperSearchQueryOptions {
  scopeIds?: readonly string[];
}

/**
 * Visibility gates for settings. The ranker treats `null` while app config
 * loads as
 * "most restrictive" so gated results can appear once config lands but never
 * flash open before it.
 */
export interface SuperSearchGates {
  isAdmin: boolean;
  loginEnabled: boolean;
  /**
   * Whether no-login mode keeps the read-only admin settings preview
   * (`system.showSettingsWhenNoLogin`, default true). Mirrors the settings
   * nav builder's admin gate: `isAdmin || (!loginEnabled && this)`.
   */
  showSettingsWhenNoLogin?: boolean;
  isAnonymous?: boolean;
}
