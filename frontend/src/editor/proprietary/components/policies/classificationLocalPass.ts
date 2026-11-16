/**
 * The Classification policy's browser-side fast path, as a {@link LocalPass} the generic local-pass
 * engine runs. Everything classification-specific lives here: the heuristic, the label/confidence it
 * writes and the browser-local run it records. The engine only sees the generic result
 * (fields to write + whether the AI server run is still needed).
 */

import { fileStorage } from "@editor/services/fileStorage";
import { classifyFileHeuristically } from "@editor/services/heuristic/heuristicClassification";
import {
  markDispatched,
  recordRunStart,
  updateRun,
} from "@editor/components/policies/policyRunStore";
import type { FileId } from "@editor/types/file";
import type { StirlingFile } from "@editor/types/fileContext";
import type { HeuristicConfidence } from "@editor/services/heuristic/types";
import {
  CLASSIFICATION_POLICY_KEY,
  localVerdictNeedsEscalation,
} from "@editor/data/classificationPolicy";
import type { LocalPass } from "@editor/components/policies/policyLocalPass";

/** How long to wait for an upload's bytes to land in IndexedDB (20 × 250ms ≈ 5s).
 *  The stub can surface in the file list a beat before its bytes are committed. */
const FILE_WAIT_TRIES = 20;
const FILE_WAIT_MS = 250;

/** localStorage flag: set to "true" for a full per-file scoring breakdown in the console. */
const DEBUG_FLAG = "stirling-classification-debug";

function isClassificationDebug(): boolean {
  try {
    return localStorage.getItem(DEBUG_FLAG) === "true";
  } catch {
    return false;
  }
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const classificationLocalPass: LocalPass = {
  // Any document without a verdict yet: an upload, or a policy's new-file output that had no parent
  // to inherit one from.
  // A file that did inherit (or was classified) carries a label array and is skipped.
  eligible: (stub) => stub.classificationLabels === undefined,
  run: async (fileId, stub) => {
    const verdict = await classifyStub(fileId, stub.name, stub.size ?? 0);
    // Bytes never landed (file removed mid-wait): leave unclassified so a reload retries.
    if (verdict == null) return null;
    return {
      stubUpdates: {
        classificationLabels: verdict.labels,
        classificationConfidence: verdict.confidence,
      },
      // A confident local verdict stands; anything less asks the AI engine, which overwrites it.
      needsServerRun: localVerdictNeedsEscalation(verdict.confidence),
    };
  },
};

/** One file's local classification verdict. */
interface ClassificationVerdict {
  labels: string[];
  confidence: HeuristicConfidence;
}

/** Classify one file; null = no verdict, retried later. */
async function classifyStub(
  fileId: FileId,
  fileName: string,
  fileSize: number,
): Promise<ClassificationVerdict | null> {
  let file: StirlingFile | null = null;
  for (let i = 0; i < FILE_WAIT_TRIES; i++) {
    file = await fileStorage.getStirlingFile(fileId).catch(() => null);
    if (file) break;
    await delay(FILE_WAIT_MS);
  }
  if (!file) {
    console.warn(
      `[Classify] ${fileName}: bytes never arrived in storage; will retry on next load`,
    );
    return null;
  }
  const debug = isClassificationDebug();
  const startedAt = performance.now();
  // Record the run only after the file bytes are available, so missing files leave no phantom row.

  // Read before recordRunStart, which takes the dispatch key itself and would otherwise always
  // answer "already dispatched", silently stopping run tracking.
  const runId = `local-${CLASSIFICATION_POLICY_KEY}-${fileId}-${Date.now()}`;
  recordRunStart({
    runId,
    policyKey: CLASSIFICATION_POLICY_KEY,
    fileId: fileId,
    fileName,
    fileSize,
    target: "local",
    // The heuristic ran in the browser - there is no server run to poll (see the poll effect).
    browserLocal: true,
    status: "RUNNING",
    outputs: [],
    error: null,
    startedAt: Date.now(),
  });
  try {
    const result = await classifyFileHeuristically(file, { explain: debug });
    const { labels } = result;
    const ms = Math.round(performance.now() - startedAt);
    const scoredAgainst =
      result.packs.length > 0
        ? result.packs.join("+")
        : `core only, ${result.language ?? "language unknown"}`;
    const verdict = labels.length > 0 ? labels.join(", ") : "no label";
    console.debug(
      `[Classify] ${fileName} -> ${verdict} (${result.confidence}, score ${result.score}, ${scoredAgainst}, ${ms}ms)`,
    );
    if (debug && result.explain) logExplanation(fileName, result);
    markDispatched(CLASSIFICATION_POLICY_KEY, fileId);
    // Labels, no output file - the same settle shape the server-run classification uses.
    updateRun(runId, {
      status: "COMPLETED",
      imported: true,
      outputFileIds: [fileId],
    });
    return { labels, confidence: result.confidence };
  } catch (err) {
    // Never persist a verdict for an unreadable file - the failure may be
    // environmental, so it must stay eligible to retry later.
    console.warn(`[Classify] ${fileName}: could not be read, will retry`, err);
    updateRun(runId, {
      status: "FAILED",
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

/** Full scoring breakdown, one collapsed console group per file (debug flag only). */
function logExplanation(
  fileName: string,
  result: Awaited<ReturnType<typeof classifyFileHeuristically>>,
): void {
  const ex = result.explain;
  if (!ex) return;
  console.groupCollapsed(
    `[Classify] ${fileName} scoring (language=${ex.language ?? "?"}${ex.assumed ? " assumed" : ""}, script=${ex.script ?? "?"}, packs=[${ex.packs.join(", ")}], lowText=${ex.lowText})`,
  );
  if (ex.candidates.length === 0) {
    console.log("no label scored above zero");
  }
  for (const c of ex.candidates) {
    console.log(
      `${c.id}${c.emit ? "" : " (suppressed)"}: score ${c.score}, ${c.distinct} distinct signals`,
    );
    for (const s of c.signals) console.log(`  ${s}`);
  }
  console.groupEnd();
}
