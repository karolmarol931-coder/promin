import { pdfWorkerManager } from "@editor/services/pdfWorkerManager";

export interface MergePageSizeSample {
  fileIndex: number;
  pageIndex: number;
  width: number;
  height: number;
}

export interface MergePageSizeNormalizationPlan {
  portraitWidth: number;
  portraitHeight: number;
  totalPageCount: number;
  referencePageCount: number;
  pages: MergePageSizeSample[];
  outlierScale: number;
}

const NORMAL_SIZE_TOLERANCE = 0.12;
const SAME_SHAPE_TOLERANCE = 0.06;
const OUTLIER_AREA_RATIO = 6.25;
const MIN_REFERENCE_SHARE = 0.6;
const MIN_REFERENCE_TO_NEXT_GROUP_RATIO = 2;

function isPdf(file: File): boolean {
  return (
    file.type.toLowerCase() === "application/pdf" ||
    file.name.toLowerCase().endsWith(".pdf")
  );
}

function normalizedSize(sample: MergePageSizeSample) {
  return {
    short: Math.min(sample.width, sample.height),
    long: Math.max(sample.width, sample.height),
    area: sample.width * sample.height,
  };
}

function isSameSizeCluster(
  first: MergePageSizeSample,
  second: MergePageSizeSample,
): boolean {
  const a = normalizedSize(first);
  const b = normalizedSize(second);
  return (
    Math.abs(a.short / b.short - 1) <= NORMAL_SIZE_TOLERANCE &&
    Math.abs(a.long / b.long - 1) <= NORMAL_SIZE_TOLERANCE
  );
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

export function detectMergePageSizeOutliers(
  samples: MergePageSizeSample[],
  totalPageCount = samples.length,
): MergePageSizeNormalizationPlan | null {
  if (samples.length < 2) return null;

  const clusters = new Map<string, MergePageSizeSample[]>();
  for (const candidate of samples) {
    const cluster = samples.filter((sample) =>
      isSameSizeCluster(candidate, sample),
    );
    const key = cluster
      .map(({ fileIndex, pageIndex }) => `${fileIndex}:${pageIndex}`)
      .sort()
      .join(",");
    clusters.set(key, cluster);
  }
  const rankedClusters = [...clusters.values()].sort(
    (first, second) => second.length - first.length,
  );
  const mainCluster = rankedClusters[0];
  if (!mainCluster) return null;
  const nextClusterSize = rankedClusters[1]?.length ?? 0;
  if (
    mainCluster.length / totalPageCount < MIN_REFERENCE_SHARE ||
    mainCluster.length < nextClusterSize * MIN_REFERENCE_TO_NEXT_GROUP_RATIO
  ) {
    return null;
  }

  const portraitWidth = median(
    mainCluster.map((sample) => normalizedSize(sample).short),
  );
  const portraitHeight = median(
    mainCluster.map((sample) => normalizedSize(sample).long),
  );
  const mainArea = portraitWidth * portraitHeight;
  const targetRatio = portraitWidth / portraitHeight;
  const pages = samples.filter((sample) => {
    const size = normalizedSize(sample);
    const shapeMatches =
      Math.abs(size.short / size.long / targetRatio - 1) <=
      SAME_SHAPE_TOLERANCE;
    const areaRatio = size.area / mainArea;
    return (
      shapeMatches &&
      (areaRatio >= OUTLIER_AREA_RATIO || areaRatio <= 1 / OUTLIER_AREA_RATIO)
    );
  });

  if (pages.length === 0) return null;
  const outlierScale = median(
    pages.map((page) => Math.sqrt(normalizedSize(page).area / mainArea)),
  );

  return {
    portraitWidth,
    portraitHeight,
    totalPageCount,
    referencePageCount: mainCluster.length,
    pages,
    outlierScale,
  };
}

export async function analyzeMergePageSizes(
  files: File[],
): Promise<MergePageSizeNormalizationPlan | null> {
  const samples: MergePageSizeSample[] = [];
  let totalPageCount = 0;

  for (const [fileIndex, file] of files.entries()) {
    if (!isPdf(file)) continue;

    const url = URL.createObjectURL(file);
    let document: Awaited<
      ReturnType<typeof pdfWorkerManager.createDocument>
    > | null = null;
    try {
      document = await pdfWorkerManager.createDocument(url, {
        disableAutoFetch: false,
        disableStream: false,
        stopAtErrors: false,
        verbosity: 0,
      });

      totalPageCount += document.numPages;
      for (let pageIndex = 0; pageIndex < document.numPages; pageIndex += 1) {
        const page = await document.getPage(pageIndex + 1);
        const viewport = page.getViewport({ scale: 1 });
        if (
          Number.isFinite(viewport.width) &&
          Number.isFinite(viewport.height) &&
          viewport.width > 0 &&
          viewport.height > 0
        ) {
          samples.push({
            fileIndex,
            pageIndex,
            width: viewport.width,
            height: viewport.height,
          });
        }
      }
    } catch {
      // Encrypted or malformed PDFs are left for the normal merge flow to handle.
    } finally {
      if (document) await pdfWorkerManager.destroyDocument(document);
      URL.revokeObjectURL(url);
    }
  }

  return detectMergePageSizeOutliers(samples, totalPageCount || samples.length);
}
