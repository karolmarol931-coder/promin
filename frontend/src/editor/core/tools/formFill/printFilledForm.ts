import { enforceExportPolicies } from "@editor/services/policyExport";
import { assertFilesNotBlocked } from "@editor/services/policyFileGuard";
import { printPdfFile } from "@editor/services/printPdfFileService";
import {
  createDiagnosticOperationId,
  recordDiagnosticEvent,
  recordDiagnosticException,
} from "@editor/services/diagnosticLog";

type SubmitForm = (file: File | Blob, flatten?: boolean) => Promise<Blob>;

export async function printFilledForm(
  file: File,
  fileId: string,
  submitForm: SubmitForm,
  diagnosticOperationId?: string,
): Promise<"printed" | "policy-applied"> {
  const operationId = diagnosticOperationId ?? createDiagnosticOperationId();
  const startedAt = Date.now();
  let phase = "prepare";
  recordDiagnosticEvent("info", "forms", "print-pipeline-started", {
    operationId,
    fileSizeBytes: file.size,
  });
  try {
    assertFilesNotBlocked([fileId]);
    phase = "fill-pdf";
    const filledBlob = await submitForm(file, true);
    assertFilesNotBlocked([fileId]);

    const filledFile = new File([filledBlob], file.name, {
      type: "application/pdf",
    });
    phase = "export-policy";
    const [enforced] = await enforceExportPolicies(
      [filledFile],
      [fileId],
      "print",
    );
    if (enforced !== filledFile) {
      recordDiagnosticEvent("info", "forms", "print-pipeline-policy-applied", {
        operationId,
        durationMs: Date.now() - startedAt,
      });
      return "policy-applied";
    }

    assertFilesNotBlocked([fileId]);
    phase = "native-print";
    await printPdfFile(filledFile, filledFile.name);
    recordDiagnosticEvent("info", "forms", "print-pipeline-succeeded", {
      operationId,
      durationMs: Date.now() - startedAt,
    });
    return "printed";
  } catch (error) {
    recordDiagnosticException("forms", "print-pipeline-failed", error, {
      operationId,
      phase,
      durationMs: Date.now() - startedAt,
      fileSizeBytes: file.size,
    });
    throw error;
  }
}
