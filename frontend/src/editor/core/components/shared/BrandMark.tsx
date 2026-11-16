import prominMark from "@editor/assets/brand/promin/promin-location-mark.svg";
import "@editor/components/shared/BrandMark.css";

interface BrandMarkProps {
  /** Height of the mark (CSS length). */
  height?: string;
  className?: string;
}

export function BrandMark({ height = "1.6rem", className }: BrandMarkProps) {
  return (
    <img
      src={prominMark}
      alt="Promin"
      className={`sui-brandmark${className ? ` ${className}` : ""}`}
      title="Promin"
      style={{ height, width: "auto" }}
    />
  );
}
