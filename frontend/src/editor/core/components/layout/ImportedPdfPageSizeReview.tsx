import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Stack, Text } from "@mantine/core";
import { Button } from "@editor/ui/Button";
import { Modal } from "@editor/ui/Modal";
import { useNavigationActions } from "@editor/contexts/NavigationContext";
import { useFileHandler } from "@editor/hooks/useFileHandler";
import { analyzeMergePageSizes, type MergePageSizeNormalizationPlan } from "@editor/tools/merge/pageSizeAnalysis";
import { normalizePdfPageSizes } from "@editor/services/normalizePdfPageSizes";
import { subscribeToWorkbenchFilesAdded } from "@editor/services/workbenchFileEvents";
import type { StirlingFile } from "@editor/types/fileContext";

interface PageSizeReview {
  file: StirlingFile;
  plan: MergePageSizeNormalizationPlan;
}

export default function ImportedPdfPageSizeReview() {
  const { addFiles } = useFileHandler();
  const { actions: navigationActions } = useNavigationActions();
  const { t } = useTranslation();
  const [review, setReview] = useState<PageSizeReview | null>(null);
  const [normalizing, setNormalizing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const queue = useRef<StirlingFile[]>([]);
  const queuedIds = useRef(new Set<string>());
  const reviewRef = useRef<PageSizeReview | null>(null);
  const processing = useRef(false);

  const processQueue = useCallback(async () => {
    if (processing.current || reviewRef.current) return;
    processing.current = true;
    try {
      while (queue.current.length > 0 && !reviewRef.current) {
        const file = queue.current.shift();
        if (!file) continue;
        let plan: MergePageSizeNormalizationPlan | null = null;
        try {
          plan = await analyzeMergePageSizes([file]);
        } catch {
          continue;
        }
        if (!plan) continue;
        const nextReview = { file, plan };
        reviewRef.current = nextReview;
        setError(null);
        setReview(nextReview);
      }
    } finally {
      processing.current = false;
    }
  }, []);

  useEffect(() => {
    return subscribeToWorkbenchFilesAdded((files) => {
      for (const file of files) {
        if (
          queuedIds.current.has(file.fileId) ||
          !(file.type.toLowerCase() === "application/pdf" || /\.pdf$/i.test(file.name))
        ) {
          continue;
        }
        queuedIds.current.add(file.fileId);
        queue.current.push(file);
      }
      void processQueue();
    });
  }, [processQueue]);

  const dismissReview = useCallback(() => {
    if (normalizing) return;
    reviewRef.current = null;
    setReview(null);
    setError(null);
    void processQueue();
  }, [normalizing, processQueue]);

  const handleNormalize = useCallback(async () => {
    if (!review || normalizing) return;
    setNormalizing(true);
    setError(null);
    try {
      const normalized = await normalizePdfPageSizes(review.file, review.plan);
      const added = await addFiles([normalized], { selectFiles: true });
      if (added.length === 0) {
        throw new Error(t("workbench.pageSizeReview.addFailed", "The adjusted copy could not be added to the workbench."));
      }
      reviewRef.current = null;
      setReview(null);
      navigationActions.setWorkbench("viewer");
      void processQueue();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : t("workbench.pageSizeReview.failed", "Could not create the adjusted copy. The original file is unchanged."),
      );
    } finally {
      setNormalizing(false);
    }
  }, [addFiles, navigationActions, normalizing, processQueue, review, t]);

  return (
    <Modal
      open={review !== null}
      onClose={dismissReview}
      title={t("workbench.pageSizeReview.title", "Different page sizes in this PDF")}
      subtitle={t("workbench.pageSizeReview.subtitle", "Some pages are much larger or smaller than the rest.")}
      width="md"
      disableBackdropClose={normalizing}
      disableEscapeClose={normalizing}
      footer={
        <Stack gap="sm">
          <Button onClick={() => void handleNormalize()} disabled={normalizing} fullWidth>
            {normalizing
              ? t("workbench.pageSizeReview.working", "Creating copy…")
              : t("workbench.pageSizeReview.normalize", "Resize pages and open a copy")}
          </Button>
          <Button variant="secondary" onClick={dismissReview} disabled={normalizing} fullWidth>
            {t("workbench.pageSizeReview.keep", "Keep the original sizes")}
          </Button>
        </Stack>
      }
    >
      <Stack gap="sm">
        <Text>
          {t(
            "workbench.pageSizeReview.description",
            "Create a separate copy with the unusual pages resized proportionally to match the most common page size. The original file will not change.",
          )}
        </Text>
        {review && (
          <>
            <Text fw={600}>
              {t("workbench.pageSizeReview.file", "File")}: {review.file.name}
            </Text>
            <Text fw={600}>
              {t("workbench.pageSizeReview.pages", "Pages to resize")}:{" "}
              {review.plan.pages.map((page) => page.pageIndex + 1).join(", ")}
            </Text>
            <Text size="sm" c="dimmed">
              {t("workbench.pageSizeReview.target", "Most common page size")}: {review.plan.portraitWidth.toFixed(0)} ×{" "}
              {review.plan.portraitHeight.toFixed(0)} pt
            </Text>
          </>
        )}
        {error && (
          <Text c="red" role="alert">
            {error}
          </Text>
        )}
      </Stack>
    </Modal>
  );
}
