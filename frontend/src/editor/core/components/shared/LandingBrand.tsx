import prominLogo from "@editor/assets/brand/promin/promin-partner-logo.svg";
import prominLogoDark from "@editor/assets/brand/promin/promin-partner-logo-dark.svg";
import prominSnowCap from "@editor/assets/brand/promin/promin-snow-cap.svg";
import { ProminHolidayDecorations } from "@editor/components/shared/ProminHolidayDecorations";
import "@editor/components/shared/ProminBrand.css";

export function LandingBrand({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`promin-brand ${compact ? "promin-brand--compact" : "promin-brand--landing"} landing-logo-enter`}
    >
      <img src={prominLogo} alt="Promin Partner" />
      <img
        className="promin-brand__dark"
        src={prominLogoDark}
        alt=""
        aria-hidden="true"
      />
      <img
        className="promin-brand__snow"
        src={prominSnowCap}
        alt=""
        aria-hidden="true"
      />
      {!compact && <ProminHolidayDecorations />}
    </div>
  );
}
