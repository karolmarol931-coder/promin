import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Paper, Stack, Text } from "@mantine/core";
import { Button } from "@editor/ui/Button";
import { Modal } from "@editor/ui/Modal";
import { useNavigationActions } from "@editor/contexts/NavigationContext";
import { useFileHandler } from "@editor/hooks/useFileHandler";
import {
  analyzeMergePageSizes,
  type MergePageSizeNormalizationPlan,
  type MergePageSizeSample,
} from "@editor/tools/merge/pageSizeAnalysis";
import { normalizePdfPageSizes } from "@editor/services/normalizePdfPageSizes";
import { subscribeToWorkbenchFilesAdded } from "@editor/services/workbenchFileEvents";
import type { StirlingFile } from "@editor/types/fileContext";
import { PageSizeReviewDetails, pageSizeSampleKey } from "@editor/components/layout/PageSizeReviewDetails";

interface PageSizeReview {
  file: StirlingFile;
  plan: MergePageSizeNormalizationPlan;
}

export default function ImportedPdfPageSizeReview() {
  const { addFiles } = useFileHandler();
  const { actions: navigationActions } = useNavigationActions();
  const { t } = useTranslation();
  const [review, setReview] = useState<PageSizeReview | null>(null);
  const [selectedPages, setSelectedPages] = useState<Set<string>>(new Set());
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
        setSelectedPages(new Set(plan.pages.map(pageSizeSampleKey)));
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
    setSelectedPages(new Set<string>());
    setError(null);
    void processQueue();
  }, [normalizing, processQueue]);

  const handleNormalize = useCallback(async () => {
    if (!review || normalizing) return;
    const pages = review.plan.pages.filter((page) => selectedPages.has(pageSizeSampleKey(page)));
    if (pages.length === 0) return;

    setNormalizing(true);
    setError(null);
    try {
      const normalized = await normalizePdfPageSizes(review.file, {
        ...review.plan,
        pages,
      });
      const added = await addFiles([normalized], { selectFiles: true });
      if (added.length === 0) {
        throw new Error(t("workbench.pageSizeReview.addFailed", "The adjusted copy could not be added to the workbench."));
      }
      reviewRef.current = null;
      setReview(null);
      setSelectedPages(new Set<string>());
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
  }, [addFiles, navigationActions, normalizing, processQueue, review, selectedPages, t]);

  const togglePage = useCallback((page: MergePageSizeSample, checked: boolean) => {
    setSelectedPages((current) => {
      const next = new Set(current);
      if (checked) next.add(pageSizeSampleKey(page));
      else next.delete(pageSizeSampleKey(page));
      return next;
    });
  }, []);

  const selectedCount = review ? review.plan.pages.filter((page) => selectedPages.has(pageSizeSampleKey(page))).length : 0;

  return (
    <Modal
      open={review !== null}
      onClose={dismissReview}
      title={t("workbench.pageSizeReview.title", "Different page sizes in this PDF")}
      subtitle={t("workbench.pageSizeReview.subtitle", "Review the suggested pages before creating a copy.")}
      width="lg"
      disableBackdropClose={normalizing}
      disableEscapeClose={normalizing}
      footer={
        <Stack gap="sm">
          <Button onClick={() => void handleNormalize()} disabled={normalizing || selectedCount === 0} fullWidth>
            {normalizing
              ? t("workbench.pageSizeReview.working", "Creating copy…")
              : t("workbench.pageSizeReview.normalize", "Create a copy with selected pages resized")}
          </Button>
          <Button variant="secondary" onClick={dismissReview} disabled={normalizing} fullWidth>
            {t("workbench.pageSizeReview.keep", "Keep the original PDF")}
          </Button>
        </Stack>
      }
    >
      <Stack gap="md">
        {review && (
          <>
            <Paper withBorder radius="md" p="md">
              <Text size="sm" c="dimmed">
                {t("workbench.pageSizeReview.file", "File")}
              </Text>
              <Text fw={600} style={{ overflowWrap: "anywhere" }}>
                {review.file.name}
              </Text>
            </Paper>
            <PageSizeReviewDetails plan={review.plan} selectedPages={selectedPages} onTogglePage={togglePage} />
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
