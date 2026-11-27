import winterVignette from "@editor/assets/seasonal/winter-vignette.svg";
import taxiSign from "@editor/assets/seasonal/winter-taxi-sign.svg";
import prominPartnerLogo from "@editor/assets/brand/promin/promin-partner-logo-black.svg";

export function WinterScene() {
  return (
    <div className="landing-page__winter-scene" aria-hidden="true">
      <img
        className="winter-scene__art"
        src={winterVignette}
        alt=""
        draggable={false}
      />
      <div className="winter-scene__taxi-sign">
        <img className="winter-scene__taxi-sign-body" src={taxiSign} alt="" draggable={false} />
        <img
          className="winter-scene__taxi-sign-logo"
          src={prominPartnerLogo}
          alt=""
          draggable={false}
        />
      </div>
    </div>
  );
}
