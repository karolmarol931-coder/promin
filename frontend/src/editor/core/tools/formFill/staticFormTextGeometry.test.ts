import { describe, expect, it } from "vitest";
import {
  getStaticTextMaskBounds,
  hasStaticRadioCaptionNearWidget,
  hasStaticTextInsideWidget,
} from "@editor/tools/formFill/staticFormTextGeometry";
import type { WidgetCoordinates } from "@editor/tools/formFill/types";

const widget: WidgetCoordinates = {
  pageIndex: 0,
  x: 50,
  y: 100,
  width: 10,
  height: 10,
};
const pageBox = { left: 0, bottom: 0, right: 612, top: 792 };

describe("getStaticTextMaskBounds", () => {
  it("converts a crop-relative widget to PDF coordinates", () => {
    expect(
      getStaticTextMaskBounds(widget, {
        left: 18,
        bottom: 32,
        right: 630,
        top: 824,
      }),
    ).toEqual({ x: 69, y: 715, width: 8, height: 8 });
  });
});

function textChars(text: string, left: number, top: number) {
  return Array.from(text, (char, index) => ({
    text: char,
    left: left + index * 6,
    bottom: top - 10,
    right: left + index * 6 + 5,
    top,
  }));
}

describe("hasStaticRadioCaptionNearWidget", () => {
  it("detects an exact caption beside the radio widget on the same row", () => {
    expect(
      hasStaticRadioCaptionNearWidget(
        "wniosek",
        widget,
        pageBox,
        textChars("wniosek", 64, 692),
      ),
    ).toBe(true);
  });

  it("does not hide a caption printed elsewhere on the page", () => {
    expect(
      hasStaticRadioCaptionNearWidget(
        "wniosek",
        widget,
        pageBox,
        textChars("wniosek", 180, 692),
      ),
    ).toBe(false);
  });

  it("does not hide a caption printed on another row", () => {
    expect(
      hasStaticRadioCaptionNearWidget(
        "wniosek",
        widget,
        pageBox,
        textChars("wniosek", 64, 650),
      ),
    ).toBe(false);
  });

  it("detects the printed caption with the document's CropBox offset", () => {
    const cropBox = {
      left: -11.9622,
      bottom: 11.9906,
      right: 583.238,
      top: 853.671,
    };
    const formWidget: WidgetCoordinates = {
      pageIndex: 0,
      x: 73.2769,
      y: 184.421,
      width: 14.7271,
      height: 13.854,
    };
    const printedCaption = textChars("wniosek", 77.76, 670.487).map((char) => ({
      ...char,
      bottom: 655.716,
    }));

    expect(
      hasStaticRadioCaptionNearWidget(
        "wniosek",
        formWidget,
        cropBox,
        printedCaption,
      ),
    ).toBe(true);
  });

  it("detects a printed option label when its text differs from the export value", () => {
    expect(
      hasStaticRadioCaptionNearWidget(
        "export-value",
        widget,
        pageBox,
        textChars("printed label", 64, 692),
      ),
    ).toBe(true);
  });

  it("detects a same-row printed caption that overlaps the widget edge", () => {
    expect(
      hasStaticRadioCaptionNearWidget(
        "different-export-value",
        widget,
        pageBox,
        textChars("printed label", 42, 692),
      ),
    ).toBe(true);
  });
});

describe("hasStaticTextInsideWidget", () => {
  it("detects page text within a widget rectangle", () => {
    expect(
      hasStaticTextInsideWidget(
        widget,
        pageBox,
        textChars("existing", 52, 692),
      ),
    ).toBe(true);
  });

  it("ignores text outside a widget rectangle", () => {
    expect(
      hasStaticTextInsideWidget(
        widget,
        pageBox,
        textChars("existing", 80, 692),
      ),
    ).toBe(false);
  });
});
