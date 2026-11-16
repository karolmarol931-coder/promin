import type { AppConfig } from "@editor/types/appConfig";

/**
 * Default configuration used while the bundled backend starts up.
 */
export const DESKTOP_DEFAULT_APP_CONFIG: AppConfig = {
  enableLogin: false,
  defaultHideUnavailableTools: true,
  defaultHideUnavailableConversions: true,
  premiumEnabled: false,
  runningProOrHigher: false,
  aiEngineEnabled: false,
  storageEnabled: false,
  storageSharingEnabled: false,
  storageShareLinksEnabled: false,
  storageShareEmailEnabled: false,
  storageGroupSigningEnabled: false,
};
