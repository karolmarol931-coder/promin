import { enforceExportPolicies } from "@editor/services/policyExport";
import { assertFilesNotBlocked } from "@editor/services/policyFileGuard";
import { printPdfFile } from "@editor/services/printPdfFileService";

type SubmitForm = (file: File | Blob, flatten?: boolean) => Promise<Blob>;

export async function printFilledForm(
  file: File,
  fileId: string,
  submitForm: SubmitForm,
): Promise<"printed" | "policy-applied"> {
  assertFilesNotBlocked([fileId]);
  const filledBlob = await submitForm(file, true);
  assertFilesNotBlocked([fileId]);

  const filledFile = new File([filledBlob], file.name, {
    type: "application/pdf",
  });
  const [enforced] = await enforceExportPolicies(
    [filledFile],
    [fileId],
    "print",
  );
  if (enforced !== filledFile) return "policy-applied";

  assertFilesNotBlocked([fileId]);
  await printPdfFile(filledFile, filledFile.name);
  return "printed";
}
