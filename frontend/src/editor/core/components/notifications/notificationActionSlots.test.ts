import { describe, expect, it } from "vitest";
import { promoteActions } from "@editor/components/notifications/notificationActionSlots";
import type {
  NotificationActionOffer,
  NotificationActionSlot,
} from "@editor/services/notifications";

// Slot and key order both copy FailureKind.java, which FailureKindTest pins: declared order is the
// tiebreak within a slot, so a fixture that drifts from it tests a shape no server sends.

/** The offers as `FailureKind.UNKNOWN` declares them. */
const UNKNOWN_OFFERS: Record<string, NotificationActionOffer> = {
  OPEN_IN_TOOL: offer("OPEN_IN_TOOL", "SECONDARY"),
  VIEW_FILE: offer("VIEW_FILE", "SECONDARY"),
  FUTURE_ACTION: offer("FUTURE_ACTION", "OVERFLOW"),
};

/** The offers as `FailureKind.INPUT_PASSWORD_PROTECTED` declares them. */
const PASSWORD_OFFERS: Record<string, NotificationActionOffer> = {
  DECRYPT: offer("DECRYPT", "RESOLUTION"),
  VIEW_FILE: offer("VIEW_FILE", "SECONDARY"),
  FUTURE_ACTION: offer("FUTURE_ACTION", "OVERFLOW"),
  OPEN_IN_TOOL: offer("OPEN_IN_TOOL", "OVERFLOW"),
};

/** The reasons the server sends with an action it would refuse. */
const NO_DOCUMENT = "portal.failures.disabled.noDocument";
const UNATTENDED = "portal.failures.disabled.unattended";
const CLOSED = "portal.failures.disabled.closed";

function offer(
  id: string,
  slot: NotificationActionSlot,
  overrides: Partial<NotificationActionOffer> = {},
): NotificationActionOffer {
  return {
    id,
    labelKey: `portal.failures.action.${id.toLowerCase()}`,
    defaultLabel: id,
    slot,
    enabled: true,
    disabledReasonKey: null,
    ...overrides,
  };
}

function from(
  declared: Record<string, NotificationActionOffer>,
  ids: string[],
): NotificationActionOffer[] {
  return ids.map((id) => {
    const found = declared[id];
    if (!found) throw new Error(`That kind offers no ${id}`);
    return found;
  });
}

const unknown = (...ids: string[]) => from(UNKNOWN_OFFERS, ids);

const password = (...ids: string[]) => from(PASSWORD_OFFERS, ids);

/** The same offers, with the named ones refused as the server would refuse them. */
function refusing(
  offers: NotificationActionOffer[],
  reasonKey: string,
  ...ids: string[]
): NotificationActionOffer[] {
  return offers.map((action) =>
    ids.includes(action.id)
      ? { ...action, enabled: false, disabledReasonKey: reasonKey }
      : action,
  );
}

/** Everything this client can do, with the file on this device. */
const RUNNABLE = new Set([
  "OPEN_IN_TOOL",
  "DECRYPT",
  "VIEW_FILE",
  "FUTURE_ACTION",
]);

/** The predicate the bell supplies: a known id, on a device that can act on it. */
const canRun = (action: NotificationActionOffer) => RUNNABLE.has(action.id);

/** The build's knowledge alone, which is what gates a withheld reason. */
const knowsAction = (action: NotificationActionOffer) =>
  RUNNABLE.has(action.id);

function promoted(list: NotificationActionOffer[]) {
  const { primary, secondary, overflow, withheldReasonKey } = promoteActions(
    list,
    canRun,
    knowsAction,
  );
  return {
    primary: primary?.id ?? null,
    secondary: secondary?.id ?? null,
    overflow: overflow.map((action) => action.id),
    withheldReasonKey,
  };
}

describe("promoteActions", () => {
  it("gives the owner the retry, with their own document beside it", () => {
    // The local workbench knows the owner actions it can resolve.
    expect(promoted(unknown("OPEN_IN_TOOL", "VIEW_FILE"))).toEqual({
      primary: "OPEN_IN_TOOL",
      secondary: "VIEW_FILE",
      overflow: [],
      withheldReasonKey: null,
    });
  });

  it("leads an attended policy failure with the queue, and states what was refused", () => {
    // Not the reader's document, so a greyed unlock would be false hope: the note stays instead.
    expect(
      promoted(
        refusing(
          unknown("OPEN_IN_TOOL", "VIEW_FILE", "FUTURE_ACTION"),
          NO_DOCUMENT,
          "OPEN_IN_TOOL",
          "VIEW_FILE",
        ),
      ),
    ).toEqual({
      primary: "FUTURE_ACTION",
      secondary: null,
      overflow: [],
      withheldReasonKey: NO_DOCUMENT,
    });
  });

  it("leads an unattended failure with the queue, and says retrying is not available", () => {
    // Nobody holds the document: one reason for the row, from the best thing it lost.
    expect(
      promoted(
        refusing(
          unknown("OPEN_IN_TOOL", "VIEW_FILE", "FUTURE_ACTION"),
          UNATTENDED,
          "OPEN_IN_TOOL",
          "VIEW_FILE",
        ),
      ),
    ).toEqual({
      primary: "FUTURE_ACTION",
      secondary: null,
      overflow: [],
      withheldReasonKey: UNATTENDED,
    });
  });

  it("explains nothing on a colleague's failure, having taken nothing away", () => {
    // Nothing needing the bytes was offered, so there is no loss to account for.
    expect(promoted(unknown("FUTURE_ACTION"))).toEqual({
      primary: "FUTURE_ACTION",
      secondary: null,
      overflow: [],
      withheldReasonKey: null,
    });
  });

  it("leads a password failure with the unlock, not the plain retry", () => {
    // Running it again unchanged is a second answer to the same problem, so it drops behind.
    expect(promoted(password("DECRYPT", "VIEW_FILE", "OPEN_IN_TOOL"))).toEqual({
      primary: "DECRYPT",
      secondary: "VIEW_FILE",
      overflow: ["OPEN_IN_TOOL"],
      withheldReasonKey: null,
    });
  });

  it("gives a reviewer their own password failure the unlock, then the document", () => {
    // The queue is a reviewer's route to the policy, not to this document: it stays in the menu.
    expect(
      promoted(
        password("DECRYPT", "VIEW_FILE", "FUTURE_ACTION", "OPEN_IN_TOOL"),
      ),
    ).toEqual({
      primary: "DECRYPT",
      secondary: "VIEW_FILE",
      overflow: ["FUTURE_ACTION", "OPEN_IN_TOOL"],
      withheldReasonKey: null,
    });
  });

  it("leaves a closed row no buttons at all, only its reason", () => {
    // Already closed elsewhere: every offer refused, so the row is its message plus one line.
    expect(
      promoted(
        refusing(
          unknown("OPEN_IN_TOOL", "VIEW_FILE"),
          CLOSED,
          "OPEN_IN_TOOL",
          "VIEW_FILE",
        ),
      ),
    ).toEqual({
      primary: null,
      secondary: null,
      overflow: [],
      withheldReasonKey: CLOSED,
    });
  });

  it("promotes past a resolution the shell cannot deliver", () => {
    // The local workbench cannot unlock an item when it lacks its document bytes.
    const withoutWorkbench = (action: NotificationActionOffer) =>
      action.id !== "DECRYPT" && canRun(action);

    const { primary, secondary, overflow } = promoteActions(
      password("DECRYPT", "VIEW_FILE", "OPEN_IN_TOOL"),
      withoutWorkbench,
      knowsAction,
    );

    // The runner-up takes the row, and nothing is promoted into the secondary slot behind it.
    expect(primary?.id).toBe("VIEW_FILE");
    expect(secondary).toBeNull();
    expect(overflow.map((action) => action.id)).toEqual(["OPEN_IN_TOOL"]);
  });

  it("drops a client action this device cannot perform, without inventing a reason", () => {
    // The document is gone from this browser: the actions disappear rather than fail on click.
    const { primary, overflow, withheldReasonKey } = promoteActions(
      unknown("OPEN_IN_TOOL", "VIEW_FILE"),
      () => false,
      knowsAction,
    );

    expect(primary).toBeNull();
    expect(overflow).toEqual([]);
    expect(withheldReasonKey).toBeNull();
  });

  it("skips an action id it has never heard of without touching the rest", () => {
    // The server ships a kind with a new action before this build knows what it means.
    const list = [
      offer("QUARANTINE", "RESOLUTION"),
      ...unknown("OPEN_IN_TOOL"),
    ];

    expect(promoted(list)).toEqual({
      primary: "OPEN_IN_TOOL",
      secondary: null,
      overflow: [],
      withheldReasonKey: null,
    });
  });

  it("has nothing to promote when nothing survives", () => {
    expect(
      promoteActions(
        [],
        () => true,
        () => true,
      ),
    ).toEqual({
      primary: null,
      secondary: null,
      overflow: [],
      withheldReasonKey: null,
    });
  });

  it("never explains the row with an action this build has never heard of", () => {
    // A client that could never have drawn the button is not explained by its reason.
    const list = [
      offer("QUARANTINE", "RESOLUTION", {
        enabled: false,
        disabledReasonKey: NO_DOCUMENT,
      }),
      ...unknown("FUTURE_ACTION"),
    ];

    expect(promoted(list)).toEqual({
      primary: "FUTURE_ACTION",
      secondary: null,
      overflow: [],
      withheldReasonKey: null,
    });
  });

  it("takes the reason from the best action lost, not the first declared", () => {
    // Two refusals, one row: the reader gets the one they would have reached for first.
    const list = [
      offer("OPEN_IN_TOOL", "OVERFLOW", {
        enabled: false,
        disabledReasonKey: CLOSED,
      }),
      offer("DECRYPT", "RESOLUTION", {
        enabled: false,
        disabledReasonKey: NO_DOCUMENT,
      }),
      ...password("FUTURE_ACTION"),
    ];

    expect(promoted(list).withheldReasonKey).toBe(NO_DOCUMENT);
  });
});
