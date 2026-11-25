import type { WidgetCoordinates } from "@editor/tools/formFill/types";

export interface TextCharBounds {
  text: string;
  left: number;
  bottom: number;
  right: number;
  top: number;
}

export interface PageTextBounds {
  left: number;
  bottom: number;
  right: number;
  top: number;
}

export interface StaticTextMaskBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function getStaticTextMaskBounds(
  widget: WidgetCoordinates,
  pageBox: PageTextBounds,
): StaticTextMaskBounds {
  const inset = Math.min(1, widget.width / 4, widget.height / 4);
  return {
    x: pageBox.left + widget.x + inset,
    y: pageBox.top - widget.y - widget.height + inset,
    width: widget.width - inset * 2,
    height: widget.height - inset * 2,
  };
}

function normalizeCaption(text: string): string {
  return text.normalize("NFKC").toLocaleLowerCase().replace(/\s/g, "");
}

function hasTextBesideWidget(
  widget: WidgetCoordinates,
  pageBox: PageTextBounds,
  chars: TextCharBounds[],
): boolean {
  const widgetLeft = widget.x;
  const widgetRight = widget.x + widget.width;
  const widgetCenterY = widget.y + widget.height / 2;
  const verticalTolerance = Math.max(7, widget.height * 0.65);
  const horizontalInset = Math.max(12, widget.height * 1.5);
  const horizontalExtension = Math.max(24, widget.height * 3);
  const adjacentChars = chars.filter((char) => {
    if (!char.text.trim()) return false;
    const left = char.left - pageBox.left;
    const right = char.right - pageBox.left;
    const top = pageBox.top - char.top;
    const bottom = pageBox.top - char.bottom;
    const centerY = (top + bottom) / 2;
    return (
      right >= widgetLeft - horizontalInset &&
      left <= widgetRight + horizontalExtension &&
      Math.abs(centerY - widgetCenterY) <= verticalTolerance &&
      char.top - char.bottom >= 2
    );
  });

  return adjacentChars.length >= 2;
}

export function hasStaticRadioCaptionNearWidget(
  caption: string,
  widget: WidgetCoordinates,
  pageBox: PageTextBounds,
  chars: TextCharBounds[],
): boolean {
  const normalizedCaption = normalizeCaption(caption);
  if (!normalizedCaption) return false;

  let pageText = "";
  const spans: Array<{ start: number; end: number; charIndex: number }> = [];
  chars.forEach((char, charIndex) => {
    const normalizedChar = normalizeCaption(char.text);
    if (!normalizedChar) return;
    spans.push({
      start: pageText.length,
      end: pageText.length + normalizedChar.length,
      charIndex,
    });
    pageText += normalizedChar;
  });

  const widgetRight = widget.x + widget.width;
  const widgetCenterY = widget.y + widget.height / 2;
  const verticalTolerance = Math.max(7, widget.height * 0.65);
  let matchStart = pageText.indexOf(normalizedCaption);

  while (matchStart >= 0) {
    const matchEnd = matchStart + normalizedCaption.length;
    const firstSpan = spans.find(
      (span) => span.start <= matchStart && span.end > matchStart,
    );
    const lastSpan = spans.find(
      (span) => span.start < matchEnd && span.end >= matchEnd,
    );

    if (firstSpan && lastSpan) {
      const matchedChars = chars.slice(
        firstSpan.charIndex,
        lastSpan.charIndex + 1,
      );
      const left = Math.min(...matchedChars.map((char) => char.left));
      const bottom = Math.min(...matchedChars.map((char) => char.bottom));
      const right = Math.max(...matchedChars.map((char) => char.right));
      const top = Math.max(...matchedChars.map((char) => char.top));
      const leftFromCropBox = left - pageBox.left;
      const rightFromCropBox = right - pageBox.left;
      const topFromCropBox = pageBox.top - top;
      const bottomFromCropBox = pageBox.top - bottom;
      const textCenterY = (topFromCropBox + bottomFromCropBox) / 2;
      const horizontalDistance =
        rightFromCropBox < widget.x
          ? widget.x - rightFromCropBox
          : leftFromCropBox > widgetRight
            ? leftFromCropBox - widgetRight
            : 0;

      if (
        horizontalDistance <= Math.max(32, widget.height * 2) &&
        Math.abs(textCenterY - widgetCenterY) <= verticalTolerance &&
        right - left <= Math.max(320, normalizedCaption.length * 14)
      ) {
        return true;
      }
    }

    matchStart = pageText.indexOf(normalizedCaption, matchStart + 1);
  }

  return hasTextBesideWidget(widget, pageBox, chars);
}

export function hasStaticTextInsideWidget(
  widget: WidgetCoordinates,
  pageBox: PageTextBounds,
  chars: TextCharBounds[],
): boolean {
  const widgetRight = widget.x + widget.width;
  const widgetBottom = widget.y + widget.height;
  return chars.some((char) => {
    if (!char.text.trim()) return false;
    const left = char.left - pageBox.left;
    const right = char.right - pageBox.left;
    const top = pageBox.top - char.top;
    const bottom = pageBox.top - char.bottom;
    return (
      right > widget.x + 1 &&
      left < widgetRight - 1 &&
      bottom > widget.y + 1 &&
      top < widgetBottom - 1
    );
  });
}
