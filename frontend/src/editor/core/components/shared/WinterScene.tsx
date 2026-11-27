import winterVignette from "@editor/assets/seasonal/winter-vignette.svg";

export function WinterScene() {
  return (
    <div className="landing-page__winter-scene" aria-hidden="true">
      <img
        className="winter-scene__art"
        src={winterVignette}
        alt=""
        draggable={false}
      />
    </div>
  );
}
