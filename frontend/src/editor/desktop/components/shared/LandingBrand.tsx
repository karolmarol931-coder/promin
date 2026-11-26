import prominLogo from "@editor/assets/brand/promin/promin-partner-logo.svg";
import prominLogoDark from "@editor/assets/brand/promin/promin-partner-logo-dark.svg";
import prominSnowCap from "@editor/assets/brand/promin/promin-snow-cap.svg";
import "@editor/components/shared/ProminBrand.css";

export function LandingBrand({ compact = false }: { compact?: boolean }) {
  return (
    <picture
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
      <span className="promin-brand__garland" aria-hidden="true">
        <span className="promin-brand__bulb promin-brand__bulb--one" />
        <span className="promin-brand__bulb promin-brand__bulb--two" />
        <span className="promin-brand__bulb promin-brand__bulb--three" />
        <span className="promin-brand__bulb promin-brand__bulb--four" />
        <span className="promin-brand__bulb promin-brand__bulb--five" />
        <span className="promin-brand__bulb promin-brand__bulb--six" />
        <span className="promin-brand__bulb promin-brand__bulb--seven" />
      </span>
    </picture>
  );
}
