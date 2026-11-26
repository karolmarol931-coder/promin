import apiClient from "@editor/services/apiClient";
import type { MergePageSizeNormalizationPlan } from "@editor/tools/merge/pageSizeAnalysis";

export async function normalizePdfPageSizes(file: File, plan: MergePageSizeNormalizationPlan): Promise<File> {
  const formData = new FormData();
  formData.append("fileInput", file, file.name);
  formData.append("pageIndexes", plan.pages.map((page) => page.pageIndex).join(","));
  formData.append("portraitWidth", String(plan.portraitWidth));
  formData.append("portraitHeight", String(plan.portraitHeight));

  const response = await apiClient.post<Blob>("/api/v1/general/normalize-page-sizes", formData, { responseType: "blob" });
  const name = file.name.toLowerCase().endsWith(".pdf")
    ? `${file.name.slice(0, -4)}_normalized.pdf`
    : `${file.name}_normalized.pdf`;
  return new File([response.data], name, {
    type: "application/pdf",
    lastModified: Date.now(),
  });
}
