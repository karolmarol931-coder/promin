import prominMark from "@editor/assets/brand/promin/promin-location-mark.svg";
import "@editor/components/shared/BrandMark.css";

interface BrandMarkProps {
  height?: string;
  className?: string;
}

export function BrandMark({ height = "1.6rem", className }: BrandMarkProps) {
  return (
    <img
      src={prominMark}
      alt="Promin"
      className={`sui-brandmark${className ? ` ${className}` : ""}`}
      style={{ height, width: "auto" }}
    />
  );
}
