import type { ReactNode } from "react";
import { AppProviders as CoreAppProviders } from "@editor-core/components/AppProviders";
import { DesktopConfigSync } from "@editor/components/DesktopConfigSync";
import { SaveShortcutListener } from "@editor/components/SaveShortcutListener";
import { DiskConflictHost } from "@editor/components/shared/DiskConflictHost";
import { ToolActionsContext } from "@editor/contexts/ToolActionsContext";
import { useBackendInitializer } from "@editor/hooks/useBackendInitializer";
import { DESKTOP_DEFAULT_APP_CONFIG } from "@editor/config/defaultAppConfig";

export function AppProviders({ children }: { children: ReactNode }) {
  useBackendInitializer(true);

  return (
    <CoreAppProviders
      appConfigRetryOptions={{ maxRetries: 5, initialDelay: 1000 }}
      appConfigProviderProps={{
        initialConfig: DESKTOP_DEFAULT_APP_CONFIG,
        bootstrapMode: "non-blocking",
        autoFetch: false,
      }}
    >
      <ToolActionsContext.Provider value={{}}>
        <DesktopConfigSync />
        <SaveShortcutListener />
        <DiskConflictHost />
        {children}
      </ToolActionsContext.Provider>
    </CoreAppProviders>
  );
}
