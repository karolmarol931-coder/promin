import { printPdfNatively } from "@editor/services/nativePrintService";

export async function printPdfFile(
  file: Blob,
  fileName: string,
): Promise<void> {
  await printPdfNatively(file, null, fileName);
}
