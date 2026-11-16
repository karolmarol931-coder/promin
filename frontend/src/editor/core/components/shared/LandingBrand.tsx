import prominLogo from "@editor/assets/brand/promin/promin-partner-logo.svg";
import prominLogoDark from "@editor/assets/brand/promin/promin-partner-logo-dark.svg";
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
    </picture>
  );
}
