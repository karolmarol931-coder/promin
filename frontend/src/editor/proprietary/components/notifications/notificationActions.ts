import { useCallback, useContext, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  FileActionsContext,
  FileStoreContext,
} from "@editor/contexts/file/contexts";
import { NavigationActionsContext } from "@editor/contexts/NavigationContext";
import { ViewerContext } from "@editor/contexts/ViewerContext";
import { fileStorage } from "@editor/services/fileStorage";
import { rerunPolicy } from "@editor/services/notificationPolicyRetry";
import { dispatchNotificationAction } from "@editor/services/notifications";
import { type ToolId } from "@editor/types/toolId";
import type { FileId } from "@editor/types/file";
import {
  RESOLUTIONS,
  canRetry,
  rerunOutcome,
  resolutionSpec,
  retryTargetOf,
  toolOf,
  unavailable,
} from "@editor/components/notifications/resolutions";
import {
  closesPanelFor,
  type ClientActionOutcome,
  type ClientActionRegistry,
  type ClientActionSpec,
  type NotificationActionContext,
} from "@editor-core/components/notifications/notificationActions";

export {
  closesPanelFor,
  type ClientActionOutcome,
  type ClientActionRegistry,
  type ClientActionSpec,
  type NotificationActionContext,
};

export function useNotificationActions(): ClientActionRegistry {
  const { t } = useTranslation();
  // Raw, because the wrapping hooks throw without a provider. All four are present or none are.
  const fileContext = useContext(FileActionsContext);
  const fileStore = useContext(FileStoreContext);
  const navigation = useContext(NavigationActionsContext);
  const viewer = useContext(ViewerContext);
  const canOpenHere = Boolean(fileContext && fileStore && navigation && viewer);

  /** Opens the way the file sidebar does: an id the workbench does not hold renders nothing. */
  const openInWorkbench = useCallback(
    async (fileId: string, tool: ToolId | null = null): Promise<boolean> => {
      if (!fileContext || !fileStore || !navigation || !viewer) return false;

      const stub = await fileStorage.getStirlingFileStub(fileId as FileId);
      if (!stub) return false;

      const alreadyOpen = fileStore
        .getState()
        .files.ids.some((id) => (id as string) === fileId);
      if (!alreadyOpen) {
        await fileContext.actions.addStirlingFileStubs([stub]);
      }
      viewer.setActiveFileId(fileId);
      // The viewer is what scopes a tool to one document; every other view hands it all of them.
      if (tool) {
        navigation.actions.setToolAndWorkbench(tool, "viewer");
      } else {
        navigation.actions.setWorkbench("viewer");
      }
      return true;
    },
    [fileContext, fileStore, navigation, viewer],
  );

  return useMemo<ClientActionRegistry>(() => {
    const openDocument = async (
      fileId: string | null,
    ): Promise<ClientActionOutcome | void> => {
      if (!fileId) return;

      if (canOpenHere) {
        return (await openInWorkbench(fileId)) ? undefined : { ok: false };
      }
      return unavailable(t);
    };

    /** Into the viewer, the only view that scopes the tool to the one document that failed. */
    const openToolWithDocument = async (
      fileId: string | null,
      tool: ToolId | null,
    ): Promise<ClientActionOutcome | void> => {
      if (canOpenHere && fileId) {
        return (await openInWorkbench(fileId, tool))
          ? undefined
          : unavailable(t);
      }
      return unavailable(t);
    };

    const openInTool: ClientActionSpec = {
      available: (context) => canRetry(context, fileContext),
      closesPanel: true,
      run: async (context): Promise<ClientActionOutcome | void> => {
        const target = retryTargetOf(context);
        if (!target) return unavailable(t);

        // A tool opens rather than re-runs: it failed once, so the user sees the settings first.
        if (target.kind === "tool") {
          return openToolWithDocument(
            context.notification.fileId,
            toolOf(target.payload),
          );
        }
        if (!fileContext) return unavailable(t);
        return rerunOutcome(t, await rerunPolicy(target.policy), null);
      },
    };

    const viewFile: ClientActionSpec = {
      available: (context) => context.hasLocalFile,
      closesPanel: true,
      run: (context) => openDocument(context.notification.fileId),
    };

    const heldByServer = (context: NotificationActionContext) =>
      context.notification.documentLocation === "SMART_FOLDER";

    // Watched-folder documents stay on disk, so the local backend runs their notification action.
    const askTheServer = (
      actionId: string,
      whenItFails: string,
    ): ClientActionSpec => ({
      available: heldByServer,
      run: async (context): Promise<ClientActionOutcome | void> => {
        const refusal = await dispatchNotificationAction(
          context.notification.id,
          actionId,
        );
        if (refusal === null) return;
        // The server's own words where it gave any: only it knows why the folder refused.
        return { ok: false, message: refusal || whenItFails };
      },
    });

    // One id, run by whichever side holds the document: the server resolves it per row, and this
    // picks the half that can act.
    const rerunInFolder = askTheServer(
      "OPEN_IN_TOOL",
      t(
        "notifications.retryInFolderFailed",
        "That document could not be run again just now.",
      ),
    );
    const retry: ClientActionSpec = {
      available: (context) =>
        heldByServer(context)
          ? rerunInFolder.available(context)
          : openInTool.available(context),
      // The server's half changes nothing on screen to move to, so the panel stays and shows the
      // row leave the list; the client's half opens the tool behind it.
      closesPanel: (context) => !heldByServer(context),
      run: (context) =>
        heldByServer(context)
          ? rerunInFolder.run(context)
          : openInTool.run(context),
    };

    const resolutions = Object.fromEntries(
      RESOLUTIONS.map((resolution) => [
        resolution.actionId,
        resolutionSpec(resolution, { t, fileContext, fileStore }),
      ]),
    );

    return {
      OPEN_IN_TOOL: retry,
      ...resolutions,
      VIEW_FILE: viewFile,
    };
  }, [canOpenHere, openInWorkbench, fileContext, fileStore, t]);
}
