import type { SharingEnabledResult } from "@editor-core/hooks/useSharingEnabled";

export function useSharingEnabled(): SharingEnabledResult {
  return { sharingEnabled: false, shareLinksEnabled: false };
}
