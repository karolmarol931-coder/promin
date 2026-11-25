import { getPdfAccess } from "@editor/services/pdfAccessService";
import {
  closeDocAndFreeBuffer,
  getPdfiumModule,
  openRawDocumentSafe,
  readEffectivePageBox,
  saveRawDocument,
} from "@editor/services/pdfiumService";
import { runPdfiumScan } from "@editor/services/pdfiumScanQueue";
import type {
  FormField,
  WidgetCoordinates,
} from "@editor/tools/formFill/types";
import {
  getStaticTextMaskBounds,
  hasStaticRadioCaptionNearWidget,
  hasStaticTextInsideWidget,
  type TextCharBounds,
} from "@editor/tools/formFill/staticFormTextGeometry";

function readPageTextBounds(
  m: Awaited<ReturnType<typeof getPdfiumModule>>,
  pagePtr: number,
): TextCharBounds[] {
  const textPagePtr = m.FPDFText_LoadPage(pagePtr);
  if (!textPagePtr) return [];

  const boundsPtr = m.pdfium.wasmExports.malloc(4 * 8);
  try {
    const count = m.FPDFText_CountChars(textPagePtr);
    const chars: TextCharBounds[] = [];
    for (let index = 0; index < count; index++) {
      const codePoint = m.FPDFText_GetUnicode(textPagePtr, index);
      if (codePoint <= 0) continue;
      if (
        !m.FPDFText_GetCharBox(
          textPagePtr,
          index,
          boundsPtr,
          boundsPtr + 8,
          boundsPtr + 16,
          boundsPtr + 24,
        )
      ) {
        continue;
      }

      chars.push({
        text: String.fromCodePoint(codePoint),
        left: m.pdfium.getValue(boundsPtr, "double"),
        right: m.pdfium.getValue(boundsPtr + 8, "double"),
        bottom: m.pdfium.getValue(boundsPtr + 16, "double"),
        top: m.pdfium.getValue(boundsPtr + 24, "double"),
      });
    }
    return chars;
  } finally {
    m.pdfium.wasmExports.free(boundsPtr);
    m.FPDFText_ClosePage(textPagePtr);
  }
}

/** Marks page text hidden by editable text and radio controls in the viewer. */
export async function markStaticFormText(
  file: File | Blob,
  fields: FormField[],
  data?: ArrayBuffer,
): Promise<FormField[]> {
  const needsTextScan = fields.some(
    (field) =>
      (field.type === "radio" ||
        field.type === "text" ||
        field.type === "combobox" ||
        field.type === "listbox") &&
      (field.widgets?.length ?? 0) > 0,
  );
  if (!needsTextScan) return fields;

  try {
    const bytes = data ?? (await file.arrayBuffer());
    return await runPdfiumScan(async () => {
      const m = await getPdfiumModule();
      const docPtr = await openRawDocumentSafe(
        bytes,
        getPdfAccess(file)?.password,
      );
      const marked = fields.map((field) => ({
        ...field,
        widgets: field.widgets?.map((widget) => ({ ...widget })) ?? null,
      }));

      try {
        const targetsByPage = new Map<
          number,
          Array<{
            fieldIndex: number;
            widgetIndex: number;
            widget: WidgetCoordinates;
            caption: string | null;
          }>
        >();

        marked.forEach((field, fieldIndex) => {
          field.widgets?.forEach((widget, widgetIndex) => {
            const caption =
              field.type === "radio"
                ? (field.displayOptions?.[widgetIndex] ??
                  field.options?.[widgetIndex] ??
                  widget.exportValue ??
                  null)
                : null;
            const supportedType =
              field.type === "radio" ||
              field.type === "text" ||
              field.type === "combobox" ||
              field.type === "listbox";
            if (!supportedType) return;
            const pageTargets = targetsByPage.get(widget.pageIndex) ?? [];
            pageTargets.push({ fieldIndex, widgetIndex, widget, caption });
            targetsByPage.set(widget.pageIndex, pageTargets);
          });
        });

        for (const [pageIndex, targets] of targetsByPage) {
          const pagePtr = m.FPDF_LoadPage(docPtr, pageIndex);
          if (!pagePtr) continue;
          try {
            const pageBox = readEffectivePageBox(m, pagePtr);
            const chars = readPageTextBounds(m, pagePtr);
            for (const target of targets) {
              const field = marked[target.fieldIndex];
              const widget = field?.widgets?.[target.widgetIndex];
              if (!field || !widget) continue;
              if (
                field.type === "radio" &&
                target.caption &&
                hasStaticRadioCaptionNearWidget(
                  target.caption,
                  target.widget,
                  pageBox,
                  chars,
                )
              ) {
                widget.hasStaticOptionLabel = true;
              }
              if (
                (field.type === "text" ||
                  field.type === "combobox" ||
                  field.type === "listbox") &&
                hasStaticTextInsideWidget(target.widget, pageBox, chars)
              ) {
                widget.hasStaticTextUnderlay = true;
              }
            }
          } finally {
            m.FPDF_ClosePage(pagePtr);
          }
        }
      } finally {
        closeDocAndFreeBuffer(m, docPtr);
      }

      return marked;
    });
  } catch (error) {
    console.warn(
      "[FormFill] Static form text could not be detected:",
      error instanceof Error ? error.name : "unknown error",
    );
    return fields;
  }
}

/** Adds opaque page content beneath editable widgets that cover printed text. */
export async function maskStaticFormTextUnderlays(
  file: File | Blob,
  fields: FormField[],
): Promise<Blob> {
  const access = getPdfAccess(file);
  if (access?.encrypted || access?.signed) return file;

  const widgetsByPage = new Map<number, WidgetCoordinates[]>();
  for (const field of fields) {
    if (
      field.type !== "text" &&
      field.type !== "combobox" &&
      field.type !== "listbox"
    ) {
      continue;
    }
    for (const widget of field.widgets ?? []) {
      if (!widget.hasStaticTextUnderlay) continue;
      const widgets = widgetsByPage.get(widget.pageIndex) ?? [];
      widgets.push(widget);
      widgetsByPage.set(widget.pageIndex, widgets);
    }
  }
  if (widgetsByPage.size === 0) return file;

  return runPdfiumScan(async () => {
    const m = await getPdfiumModule();
    const bytes = await file.arrayBuffer();
    const docPtr = await openRawDocumentSafe(
      bytes,
      getPdfAccess(file)?.password,
    );
    try {
      for (const [pageIndex, widgets] of widgetsByPage) {
        const pagePtr = m.FPDF_LoadPage(docPtr, pageIndex);
        if (!pagePtr) {
          throw new Error(
            `Could not open page ${pageIndex + 1} to prepare form output.`,
          );
        }
        try {
          const pageBox = readEffectivePageBox(m, pagePtr);
          for (const widget of widgets) {
            const bounds = getStaticTextMaskBounds(widget, pageBox);
            const rectPtr = m.FPDFPageObj_CreateNewRect(
              bounds.x,
              bounds.y,
              bounds.width,
              bounds.height,
            );
            if (!rectPtr) {
              throw new Error(
                "Could not prepare a clean form field for output.",
              );
            }
            if (
              !m.FPDFPageObj_SetFillColor(rectPtr, 255, 255, 255, 255) ||
              !m.FPDFPath_SetDrawMode(rectPtr, 2, false)
            ) {
              m.FPDFPageObj_Destroy(rectPtr);
              throw new Error(
                "Could not prepare a clean form field for output.",
              );
            }
            m.FPDFPage_InsertObject(pagePtr, rectPtr);
          }
          if (!m.FPDFPage_GenerateContent(pagePtr)) {
            throw new Error("Could not prepare the PDF form output.");
          }
        } finally {
          m.FPDF_ClosePage(pagePtr);
        }
      }
      return new Blob([await saveRawDocument(docPtr)], {
        type: "application/pdf",
      });
    } finally {
      closeDocAndFreeBuffer(m, docPtr);
    }
  });
}
