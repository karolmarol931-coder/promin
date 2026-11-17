import { PDFDocument } from "@cantoo/pdf-lib";
import type Tesseract from "tesseract.js";
import type { PDFDocumentProxy } from "pdfjs-dist";
import type { ProcessingProgress } from "@editor/hooks/tools/shared/useToolState";
import type { OCRParameters } from "@editor-core/hooks/tools/ocr/useOCRParameters";
import { pdfWorkerManager } from "@editor/services/pdfWorkerManager";

const RENDER_SCALE = 300 / 72;
const LOCAL_LANGUAGES = new Set(["eng", "pol", "rus"]);
const OCR_CACHE_PATH = "promin-tesseract-best-int-v1";

interface PdfInspection {
  pageCount: number;
  textPages: boolean[];
}

function assetPath(path: string): string {
  return new URL(`/ocr/${path}`, window.location.origin).toString();
}

async function inspectPdf(
  file: File,
  findTextPages: boolean,
): Promise<PdfInspection> {
  const pdf = await pdfWorkerManager.createDocument(await file.arrayBuffer());
  try {
    const textPages: boolean[] = [];
    if (findTextPages) {
      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
        const page = await pdf.getPage(pageNumber);
        const content = await page.getTextContent();
        textPages.push(
          content.items.some(
            (item) => "str" in item && item.str.trim().length > 0,
          ),
        );
        page.cleanup();
      }
    }
    return { pageCount: pdf.numPages, textPages };
  } finally {
    await pdfWorkerManager.destroyDocument(pdf);
  }
}

async function renderPdfPage(
  pdf: PDFDocumentProxy,
  pageNumber: number,
): Promise<{ canvas: HTMLCanvasElement; width: number; height: number }> {
  const page = await pdf.getPage(pageNumber);
  const pageSize = page.getViewport({ scale: 1 });
  const viewport = page.getViewport({ scale: RENDER_SCALE });
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("OCR canvas is unavailable.");

  try {
    await page.render({ canvasContext: context, canvas, viewport }).promise;
    return { canvas, width: pageSize.width, height: pageSize.height };
  } catch (error) {
    canvas.width = 0;
    canvas.height = 0;
    throw error;
  } finally {
    page.cleanup();
  }
}

async function createSearchablePdf(
  file: File,
  inspection: PdfInspection,
  worker: Tesseract.Worker,
  parameters: OCRParameters,
  onPageCompleted: (fileName: string) => void,
): Promise<File> {
  const inputBytes = new Uint8Array(await file.arrayBuffer());
  const sourcePdf = await PDFDocument.load(inputBytes);
  const outputPdf = await PDFDocument.create();
  const pdf = await pdfWorkerManager.createDocument(inputBytes.slice());
  let recognizedPageCount = 0;

  try {
    for (let pageNumber = 1; pageNumber <= inspection.pageCount; pageNumber++) {
      const hasText = inspection.textPages[pageNumber - 1] ?? false;
      const sourcePageIndex = pageNumber - 1;

      if (parameters.ocrType === "Normal" && hasText) {
        throw new Error("OCR_TEXT_ALREADY_PRESENT");
      }

      if (parameters.ocrType === "skip-text" && hasText) {
        const [page] = await outputPdf.copyPages(sourcePdf, [sourcePageIndex]);
        outputPdf.addPage(page);
        onPageCompleted(file.name);
        continue;
      }

      const { canvas, width, height } = await renderPdfPage(pdf, pageNumber);
      try {
        const { data } = await worker.recognize(
          canvas,
          { pdfTitle: file.name },
          { pdf: true },
        );
        if (!data.pdf) throw new Error("OCR did not produce a searchable PDF.");

        const pagePdf = await PDFDocument.load(Uint8Array.from(data.pdf));
        const [ocrPage] = await outputPdf.copyPages(pagePdf, [0]);
        const ocrPageSize = ocrPage.getSize();
        ocrPage.scale(width / ocrPageSize.width, height / ocrPageSize.height);
        outputPdf.addPage(ocrPage);
        recognizedPageCount++;
      } finally {
        canvas.width = 0;
        canvas.height = 0;
      }

      onPageCompleted(file.name);
    }
  } finally {
    await pdfWorkerManager.destroyDocument(pdf);
  }

  if (recognizedPageCount === 0) throw new Error("OCR_NO_SCANNED_PAGES");

  const title = sourcePdf.getTitle();
  if (title) outputPdf.setTitle(title);
  outputPdf.setCreator("Promin");
  const bytes = await outputPdf.save();
  const baseName = file.name.replace(/\.pdf$/i, "");
  const outputBuffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(outputBuffer).set(bytes);
  return new File([outputBuffer], `${baseName}_OCR.pdf`, {
    type: "application/pdf",
  });
}

export async function runLocalOcr(
  parameters: OCRParameters,
  files: File[],
  reportProgress: (progress: ProcessingProgress | null) => void,
): Promise<File[]> {
  const languages = [...new Set(parameters.languages)].filter((language) =>
    LOCAL_LANGUAGES.has(language),
  );
  if (languages.length === 0) {
    throw new Error("Select one or more supported OCR languages.");
  }

  const inspections: PdfInspection[] = [];
  for (const file of files) {
    const inspection = await inspectPdf(
      file,
      parameters.ocrType !== "force-ocr",
    );
    if (parameters.ocrType === "Normal" && inspection.textPages.some(Boolean)) {
      throw new Error("OCR_TEXT_ALREADY_PRESENT");
    }
    inspections.push(inspection);
  }

  const total = inspections.reduce(
    (count, inspection) => count + inspection.pageCount,
    0,
  );
  let current = 0;
  let currentFileName = files[0]?.name;
  reportProgress({ current, total, currentFileName });

  let worker: Tesseract.Worker | null = null;
  try {
    const { default: tesseract } = await import("tesseract.js");
    worker = await tesseract.createWorker(languages, tesseract.OEM.LSTM_ONLY, {
      workerPath: assetPath("worker.min.js"),
      corePath: assetPath("core/"),
      langPath: assetPath("lang/"),
      cachePath: OCR_CACHE_PATH,
      cacheMethod: "write",
      gzip: true,
      legacyCore: false,
      legacyLang: false,
      workerBlobURL: false,
      logger: ({ progress, status }) => {
        if (status === "recognizing text") {
          reportProgress({
            current: Math.min(total, current + progress),
            total,
            currentFileName,
          });
        }
      },
    });
    const outputs: File[] = [];
    for (const [index, file] of files.entries()) {
      currentFileName = file.name;
      outputs.push(
        await createSearchablePdf(
          file,
          inspections[index],
          worker,
          parameters,
          (fileName) => {
            current++;
            reportProgress({ current, total, currentFileName: fileName });
          },
        ),
      );
    }
    return outputs;
  } finally {
    await worker?.terminate();
    reportProgress(null);
  }
}
