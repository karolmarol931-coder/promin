import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import {
  context,
  notification,
  offer,
  policyContext,
} from "@editor/components/notifications/resolutions/testSupport";

// Where each action sends the reader. Only the editor has the workbench contexts above it.

const retryWithPassword = vi.fn();
const unlockLocalDocument = vi.fn();
const repairDocuments = vi.fn();
const retryWithFiles = vi.fn();
vi.mock("@editor/services/notificationRetry", async (importOriginal) => ({
  // The real stashMatchesKind and retryInputIds: both are pure, and their guards are part of
  // what these tests exercise.
  ...(await importOriginal<
    typeof import("@editor/services/notificationRetry")
  >()),
  retryWithPassword: (...args: unknown[]) => retryWithPassword(...args),
  unlockLocalDocument: (...args: unknown[]) => unlockLocalDocument(...args),
  repairDocuments: (...args: unknown[]) => repairDocuments(...args),
  retryWithFiles: (...args: unknown[]) => retryWithFiles(...args),
}));

const rerunPolicy = vi.fn();
const rechainPolicyOnDocument = vi.fn();
const canPlacePolicy = vi.fn();
vi.mock("@editor/services/notificationPolicyRetry", () => ({
  canPlacePolicy: (...args: unknown[]) => canPlacePolicy(...args),
  rerunPolicy: (...args: unknown[]) => rerunPolicy(...args),
  rechainPolicyOnDocument: (...args: unknown[]) =>
    rechainPolicyOnDocument(...args),
}));

const reportNotificationResolved = vi.fn();
const dispatchNotificationAction = vi.fn();
vi.mock("@editor/services/notifications", async () => ({
  ...(await vi.importActual<typeof import("@editor/services/notifications")>(
    "@editor/services/notifications",
  )),
  reportNotificationResolved: (...args: unknown[]) =>
    reportNotificationResolved(...args),
  dispatchNotificationAction: (...args: unknown[]) =>
    dispatchNotificationAction(...args),
}));

// No i18n instance here, and the plugin is stubbed because the contexts below reach `core/i18n`.
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (_key: string, fallback: string) => fallback,
  }),
  initReactI18next: { type: "3rdParty", init: () => {} },
}));

// IndexedDB, which jsdom has none of. Answered here so presence is a fact of the test.
const h = vi.hoisted(() => ({
  stub: { id: "f-1" } as unknown,
  getStirlingFileStub: vi.fn(),
}));

vi.mock("@editor/services/fileStorage", () => ({
  fileStorage: {
    getStirlingFileStub: (fileId: string) => h.getStirlingFileStub(fileId),
  },
}));

const { FileActionsContext, FileStoreContext } =
  await import("@editor/contexts/file/contexts");
const { NavigationActionsContext } =
  await import("@editor/contexts/NavigationContext");
const { ViewerContext } = await import("@editor/contexts/ViewerContext");
const { useNotificationActions } =
  await import("@editor/components/notifications/notificationActions");

const addStirlingFileStubs = vi.fn();
const setActiveFileId = vi.fn();
const setWorkbench = vi.fn();
const setToolAndWorkbench = vi.fn();
// createChildStub is stubbed too, so the test can name the version's id directly.
vi.mock("@editor/contexts/file/fileActions", () => ({
  generateProcessedFileMetadata: () => Promise.resolve(null),
  createChildStub: (parent: { id: string }, _op: unknown, file: File) => ({
    ...parent,
    id: "f-unlocked",
    name: file.name,
    versionNumber: 2,
    parentFileId: parent.id,
  }),
}));

/** What the workbench already holds, so the "do not add it twice" path can be exercised. */
let openFileIds: string[] = [];
/** Stubs the workbench holds, so the in-place replacement path has an original to version. */
let openFilesById: Record<string, unknown> = {};
const setSelectedFiles = vi.fn();
const addFiles = vi.fn();
const consumeFiles = vi.fn();

/** The editor shell: the workbench's providers all sit above the bell. */
const inEditor = ({ children }: { children: ReactNode }) => (
  <MemoryRouter>
    <FileActionsContext.Provider
      value={{
        actions: {
          addStirlingFileStubs,
          setSelectedFiles,
          addFiles,
          consumeFiles,
        } as never,
        dispatch: vi.fn(),
      }}
    >
      <FileStoreContext.Provider
        value={
          {
            getState: () => ({
              files: { ids: openFileIds, byId: openFilesById },
            }),
            subscribe: () => () => {},
            selectors: {},
          } as never
        }
      >
        <NavigationActionsContext.Provider
          value={{ actions: { setWorkbench, setToolAndWorkbench } } as never}
        >
          <ViewerContext.Provider value={{ setActiveFileId } as never}>
            {children}
          </ViewerContext.Provider>
        </NavigationActionsContext.Provider>
      </FileStoreContext.Provider>
    </FileActionsContext.Provider>
  </MemoryRouter>
);
const withoutWorkbench = ({ children }: { children: ReactNode }) => (
  <MemoryRouter>{children}</MemoryRouter>
);

function registry(wrapper = inEditor) {
  return renderHook(() => useNotificationActions(), { wrapper }).result.current;
}

beforeEach(() => {
  addStirlingFileStubs.mockReset().mockResolvedValue([]);
  setActiveFileId.mockReset();
  setWorkbench.mockReset();
  setToolAndWorkbench.mockReset();
  h.getStirlingFileStub.mockReset().mockResolvedValue(h.stub);
  openFileIds = [];
  openFilesById = {};
  setSelectedFiles.mockReset();
  consumeFiles.mockReset().mockResolvedValue(["f-unlocked"]);
  // The adopted document's own id, not the reference the failure was filed against.
  addFiles.mockReset().mockResolvedValue([{ fileId: "f-unlocked" }]);
  reportNotificationResolved.mockReset().mockResolvedValue(true);
  dispatchNotificationAction.mockReset().mockResolvedValue(null);
  retryWithPassword.mockReset().mockResolvedValue({ ok: true, files: [] });
  // The unlock succeeds by default: most cases below are about what happens afterwards.
  unlockLocalDocument.mockReset().mockResolvedValue({
    ok: true,
    files: [
      {
        blob: new Blob(["pdf"], { type: "application/pdf" }),
        filename: "invoice.pdf",
      },
    ],
  });
  // The repair succeeds by default: most cases below are about what happens afterwards.
  repairDocuments.mockReset().mockResolvedValue({
    ok: true,
    repaired: [
      {
        fileId: "f-1",
        file: {
          blob: new Blob(["repaired"], { type: "application/pdf" }),
          filename: "invoice_repaired.pdf",
        },
      },
    ],
  });
  retryWithFiles.mockReset().mockResolvedValue({ ok: true, files: [] });
  // Tracked by default: something is polling the run, so its output will arrive.
  rerunPolicy.mockReset().mockResolvedValue({ ok: true, tracked: true });
  rechainPolicyOnDocument.mockReset().mockResolvedValue({
    ok: true,
    tracked: true,
  });
  // Placeable by default: the workspace still holds the policy the failure names.
  canPlacePolicy.mockReset().mockReturnValue(true);
});

describe("useNotificationActions", () => {
  it("opens the failed tool on the failed document alone, in the viewer", async () => {
    await registry().OPEN_IN_TOOL?.run(context());

    expect(addStirlingFileStubs).toHaveBeenCalledWith([h.stub]);
    expect(setActiveFileId).toHaveBeenCalledWith("f-1");
    // The viewer scopes the tool to this one file. Any other view would hand it the whole
    // workbench, so a retry on one failed document would re-run across every open file.
    expect(setToolAndWorkbench).toHaveBeenCalledWith(
      "removePassword",
      "viewer",
    );
  });

  it("opens the document alone when the saved operation names no available tool", async () => {
    await registry().OPEN_IN_TOOL?.run(
      context({
        retryPayload: {
          operation: "quarantine",
          endpoint: "/api/v1/quarantine",
          params: {},
          fileIds: ["f-1"],
          multiFile: false,
          errorCode: "E004",
          replayUnfaithful: false,
          recordedAt: 0,
        },
      }),
    );

    expect(setActiveFileId).toHaveBeenCalledWith("f-1");
    expect(setWorkbench).toHaveBeenCalledWith("viewer");
    expect(setToolAndWorkbench).not.toHaveBeenCalled();
  });

  it("reports a retry whose document has gone from storage rather than opening nothing", async () => {
    h.getStirlingFileStub.mockResolvedValue(null);

    const outcome = await registry().OPEN_IN_TOOL?.run(context());

    expect(outcome).toEqual({
      ok: false,
      message: "This document is no longer available in this workspace.",
    });
    expect(setToolAndWorkbench).not.toHaveBeenCalled();
  });

  it("offers no retry once the document has left this workspace", () => {
    const actions = registry();

    expect(
      actions.OPEN_IN_TOOL?.available(context({ hasLocalFile: false })),
    ).toBe(false);
    expect(
      actions.OPEN_IN_TOOL?.available(context({ retryPayload: null })),
    ).toBe(false);
    expect(actions.VIEW_FILE?.available(context({ hasLocalFile: false }))).toBe(
      false,
    );
  });

  it("leaves View file as the only usable offer when the server offers actions this build cannot run", () => {
    // An id this build wires nothing for drops out rather than rendering dead.
    const actions = registry();
    const usable = [offer("QUARANTINE"), offer("VIEW_FILE")].filter(
      (candidate) => actions[candidate.id]?.available(context()) ?? false,
    );

    expect(usable.map((candidate) => candidate.id)).toEqual(["VIEW_FILE"]);
  });

  it("opens the document into the viewer when an editor is above", async () => {
    await registry().VIEW_FILE?.run(context());

    // Selecting alone shows nothing: the workbench holds neither the file nor the viewer yet.
    expect(addStirlingFileStubs).toHaveBeenCalledWith([h.stub]);
    expect(setActiveFileId).toHaveBeenCalledWith("f-1");
    expect(setWorkbench).toHaveBeenCalledWith("viewer");
  });

  it("opens the document in the current app window", async () => {
    await registry().VIEW_FILE?.run(context());

    expect(setWorkbench).toHaveBeenCalledWith("viewer");
  });

  it("does not add a document the workbench is already holding", async () => {
    openFileIds = ["f-1"];

    await registry().VIEW_FILE?.run(context());

    expect(addStirlingFileStubs).not.toHaveBeenCalled();
    // Still brought to the front: the point of the click is to look at it.
    expect(setActiveFileId).toHaveBeenCalledWith("f-1");
    expect(setWorkbench).toHaveBeenCalledWith("viewer");
  });

  it("reports a document that has gone from storage instead of opening nothing", async () => {
    h.getStirlingFileStub.mockResolvedValue(null);

    const outcome = await registry().VIEW_FILE?.run(context());

    expect(outcome).toEqual({ ok: false });
    expect(setWorkbench).not.toHaveBeenCalled();
  });
});

/** Policy notifications rerun the saved policy recorded on the row. */
describe("retrying an attended policy run", () => {
  it("runs the policy again on the document it already holds", async () => {
    const outcome = await registry().OPEN_IN_TOOL?.run(policyContext());

    expect(rerunPolicy).toHaveBeenCalledWith({
      policyId: "pol-1",
      fileId: "f-1",
    });
    expect(outcome).toEqual({ ok: true });
    // Nothing was stashed for this row, so nothing may be read from one either.
    expect(retryWithPassword).not.toHaveBeenCalled();
  });

  it("submits nothing when the policy result cannot be placed", async () => {
    canPlacePolicy.mockReturnValue(false);
    const row = policyContext();

    expect(registry().OPEN_IN_TOOL?.available?.(row)).toBe(false);

    expect(await registry().OPEN_IN_TOOL?.run(row)).toEqual({
      ok: false,
      message: "This document is no longer available in this workspace.",
    });
    expect(rerunPolicy).not.toHaveBeenCalled();
  });

  it("re-runs the policy rather than reopening its original tool", async () => {
    await registry().OPEN_IN_TOOL?.run(
      policyContext({
        retryPayload: {
          operation: "removePassword",
          endpoint: "/api/v1/security/remove-password",
          params: {},
          fileIds: ["f-1"],
          multiFile: false,
          errorCode: "E004",
          replayUnfaithful: false,
          recordedAt: 0,
        },
      }),
    );

    expect(rerunPolicy).toHaveBeenCalled();
    expect(window.location.pathname).toBe("/");
  });

  it("says the server refused rather than looking like it worked", async () => {
    rerunPolicy.mockResolvedValue({
      ok: false,
      reason: "rejected",
      message: "That policy is no longer enabled.",
    });

    expect(await registry().OPEN_IN_TOOL?.run(policyContext())).toEqual({
      ok: false,
      message: "That policy is no longer enabled.",
    });
  });

  it("has its own wording when the server refuses without any", async () => {
    rerunPolicy.mockResolvedValue({
      ok: false,
      reason: "rejected",
      message: null,
    });

    expect(await registry().OPEN_IN_TOOL?.run(policyContext())).toEqual({
      ok: false,
      message:
        "The policy could not be run again just now. Try again in a moment.",
    });
  });

  it("reports the document is gone rather than blaming the policy", async () => {
    rerunPolicy.mockResolvedValue({ ok: false, reason: "missingFile" });

    expect(await registry().OPEN_IN_TOOL?.run(policyContext())).toEqual({
      ok: false,
      message:
        "This document is not on this device, so it cannot be opened or retried here.",
    });
  });

  it("is offered for an attended row whose document is here, and for nothing else", () => {
    const actions = registry();

    expect(actions.OPEN_IN_TOOL?.available(policyContext())).toBe(true);
    expect(actions.DECRYPT?.available(policyContext())).toBe(true);

    // Unattended: the fileId hashes a path that was never on any device, so nothing can re-submit.
    const unattended = policyContext({
      notification: notification({
        origin: "POLICY",
        policyId: "pol-1",
        sourceId: "src-1",
      }),
    });
    expect(actions.OPEN_IN_TOOL?.available(unattended)).toBe(false);
    expect(actions.DECRYPT?.available(unattended)).toBe(false);

    // No policy named, and no stash either: nothing describes what would run again.
    expect(
      actions.OPEN_IN_TOOL?.available(
        policyContext({
          notification: notification({ origin: "POLICY", policyId: null }),
        }),
      ),
    ).toBe(false);

    // The file is no longer on this device.
    expect(
      actions.OPEN_IN_TOOL?.available(policyContext({ hasLocalFile: false })),
    ).toBe(false);
  });

  it("is offered nowhere without the workbench providers", () => {
    const actions = registry(withoutWorkbench);

    expect(actions.OPEN_IN_TOOL?.available(policyContext())).toBe(false);
    expect(actions.DECRYPT?.available(policyContext())).toBe(false);
  });

  it("refuses to run when the workbench cannot collect the result", async () => {
    expect(
      await registry(withoutWorkbench).OPEN_IN_TOOL?.run(policyContext()),
    ).toEqual({
      ok: false,
      message: "This document is no longer available in this workspace.",
    });
    expect(rerunPolicy).not.toHaveBeenCalled();
  });

  it("says an untracked plain re-run cannot be delivered either", async () => {
    // Same hole without a password: the cache could not place the policy, so nothing polls the run.
    rerunPolicy.mockResolvedValue({ ok: true, tracked: false });

    expect(await registry().OPEN_IN_TOOL?.run(policyContext())).toEqual({
      ok: false,
      message:
        "The policy re-run started, but its result cannot be delivered here, so this failure stays open.",
    });
    expect(reportNotificationResolved).not.toHaveBeenCalled();
  });
});

describe("OPEN_IN_TOOL for a smart folder's document", () => {
  const inFolder = () => ({
    notification: notification({
      kindId: "UNKNOWN",
      documentLocation: "SMART_FOLDER" as const,
      heldByServer: true,
      sourceId: "src-downloads",
      fileId: null,
    }),
    hasLocalFile: false,
    retryPayload: null,
  });

  it("is offered for a document held by a watched folder", () => {
    // The same action opens a tool for a local file and asks the backend for a watched-folder file.
    // be dropped for a folder's document if only that half were wired.
    expect(registry().OPEN_IN_TOOL?.available(inFolder())).toBe(true);
  });

  it("asks the server by the row's own prefixed id, under the one shared id", async () => {
    // The bell never holds a raw row id, so dispatching by anything else would 400.
    await registry().OPEN_IN_TOOL?.run(inFolder());

    expect(dispatchNotificationAction).toHaveBeenCalledWith(
      "failure:evt-1",
      "OPEN_IN_TOOL",
    );
  });

  it("reports the server's refusal rather than claiming it worked", async () => {
    dispatchNotificationAction.mockResolvedValue(
      "No smart folder to run this document in",
    );

    const outcome = await registry().OPEN_IN_TOOL?.run(inFolder());

    expect(outcome).toEqual({
      ok: false,
      message: "No smart folder to run this document in",
    });
  });
});
