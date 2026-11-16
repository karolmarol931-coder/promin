import type { CSSProperties } from "react";
import prominMark from "@editor/assets/brand/promin/promin-location-mark.svg";
import "@editor/ui/Logo.css";

/** iconOnly = mark; textOnly = wordmark; iconAndText = both. */
export type LogoVariant = "iconOnly" | "iconAndText" | "textOnly";

interface LogoProps {
  variant?: LogoVariant;
  /** Layout for iconAndText: mark left of text, or stacked above it. */
  orientation?: "horizontal" | "vertical";
  /** Height of the mark (CSS length). */
  iconHeight?: string;
  /** Height of the wordmark (CSS length). */
  textHeight?: string;
  /** Gap between mark and wordmark. */
  gap?: string;
  className?: string;
  style?: CSSProperties;
  alt?: string;
}

/** Shared Promin mark and wordmark used across the editor and processor. */
export function Logo({
  variant = "iconAndText",
  orientation = "horizontal",
  iconHeight = "1.75rem",
  textHeight = "1rem",
  gap = "0.5rem",
  className,
  style,
  alt = "Promin",
}: LogoProps) {
  const showIcon = variant === "iconOnly" || variant === "iconAndText";
  const showText = variant === "textOnly" || variant === "iconAndText";

  const cls = [
    "sui-logo",
    orientation === "vertical" ? "sui-logo--vertical" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  // Layout set inline so a consumer's className can't restack the lockup.
  const layoutStyle: CSSProperties = {
    display: orientation === "vertical" ? "flex" : "inline-flex",
    flexDirection: orientation === "vertical" ? "column" : "row",
    alignItems: "center",
    gap,
  };

  return (
    <span className={cls} style={{ ...layoutStyle, ...style }}>
      {showIcon && (
        <img
          className="sui-logo__mark"
          src={prominMark}
          alt={showText ? "" : alt}
          title={showText ? undefined : alt}
          style={{ height: iconHeight }}
        />
      )}
      {showText && (
        <span
          className="sui-logo__wordmark-text"
          style={{ fontSize: textHeight }}
        >
          PROMIN
        </span>
      )}
    </span>
  );
}
