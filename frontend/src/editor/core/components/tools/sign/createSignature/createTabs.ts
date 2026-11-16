import type { TFunction } from "i18next";
import type { IconName } from "@editor/ui/Icon";
import type { CreateTab } from "@editor/components/tools/sign/createSignature/types";

export const CREATE_TAB_ICONS: Record<CreateTab, IconName> = {
  draw: "signature",
  type: "type",
  upload: "upload",
};

export function createTabs(): CreateTab[] {
  return ["draw", "type", "upload"];
}

export function createTabLabel(t: TFunction, tab: CreateTab): string {
  const labels: Record<CreateTab, string> = {
    draw: t("sign.wallet.tabs.draw", "Draw"),
    type: t("sign.wallet.tabs.type", "Type"),
    upload: t("sign.wallet.tabs.upload", "Upload"),
  };
  return labels[tab];
}

export function defaultSignatureName(t: TFunction, tab: CreateTab): string {
  const names: Record<CreateTab, string> = {
    draw: t("sign.wallet.defaultName.draw", "My signature"),
    type: t("sign.wallet.defaultName.type", "Typed signature"),
    upload: t("sign.wallet.defaultName.upload", "Uploaded signature"),
  };
  return names[tab];
}
