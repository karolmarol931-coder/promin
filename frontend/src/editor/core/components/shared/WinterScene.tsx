import type { CSSProperties } from "react";
import winterVignette from "@editor/assets/seasonal/winter-vignette.svg";

type BulbColor = "blue" | "gold" | "green" | "red";

interface TreeLight {
  color: BulbColor;
  x: number;
  y: number;
}

interface TreePlacement {
  height: number;
  phase: number;
  width: number;
  x: number;
  y: number;
  lights: readonly TreeLight[];
}

type BulbStyle = CSSProperties & {
  "--bulb-color": string;
  "--garland-delay": string;
  "--garland-x": string;
  "--garland-y": string;
};

const BULB_COLORS: Record<BulbColor, string> = {
  blue: "var(--c-seasonal-bulb-blue)",
  gold: "var(--c-seasonal-bulb-gold)",
  green: "var(--c-seasonal-bulb-green)",
  red: "var(--c-seasonal-bulb-red)",
};

const TREES: readonly TreePlacement[] = [
  {
    x: 48,
    y: 125,
    width: 116,
    height: 162,
    phase: 0,
    lights: [
      { color: "green", x: 90, y: 55 },
      { color: "gold", x: 104, y: 85 },
      { color: "blue", x: 80, y: 111 },
      { color: "red", x: 55, y: 136 },
      { color: "gold", x: 92, y: 159 },
    ],
  },
  {
    x: 128,
    y: 84,
    width: 157,
    height: 198,
    phase: 0.28,
    lights: [
      { color: "blue", x: 90, y: 55 },
      { color: "red", x: 107, y: 89 },
      { color: "green", x: 78, y: 113 },
      { color: "gold", x: 54, y: 136 },
      { color: "blue", x: 98, y: 159 },
      { color: "red", x: 133, y: 181 },
    ],
  },
  {
    x: 241,
    y: 20,
    width: 184,
    height: 260,
    phase: 0.56,
    lights: [
      { color: "gold", x: 90, y: 55 },
      { color: "green", x: 111, y: 83 },
      { color: "red", x: 93, y: 108 },
      { color: "blue", x: 63, y: 132 },
      { color: "gold", x: 90, y: 154 },
      { color: "green", x: 127, y: 179 },
      { color: "red", x: 112, y: 204 },
      { color: "blue", x: 77, y: 229 },
    ],
  },
  {
    x: 365,
    y: 88,
    width: 146,
    height: 196,
    phase: 0.84,
    lights: [
      { color: "green", x: 90, y: 55 },
      { color: "blue", x: 109, y: 87 },
      { color: "gold", x: 80, y: 112 },
      { color: "red", x: 55, y: 137 },
      { color: "green", x: 97, y: 159 },
      { color: "blue", x: 132, y: 182 },
    ],
  },
  {
    x: 479,
    y: 137,
    width: 108,
    height: 149,
    phase: 1.12,
    lights: [
      { color: "red", x: 90, y: 55 },
      { color: "gold", x: 106, y: 88 },
      { color: "blue", x: 79, y: 111 },
      { color: "green", x: 55, y: 137 },
      { color: "gold", x: 96, y: 160 },
    ],
  },
];

function getBulbStyle(
  tree: TreePlacement,
  bulb: TreeLight,
  index: number,
): BulbStyle {
  const delay = (index * 0.29 + tree.phase) % 2.4;

  return {
    "--bulb-color": BULB_COLORS[bulb.color],
    "--garland-delay": `-${delay.toFixed(2)}s`,
    "--garland-x": `${((tree.x + (bulb.x / 180) * tree.width) / 760) * 100}%`,
    "--garland-y": `${((tree.y + (bulb.y / 260) * tree.height) / 320) * 100}%`,
  };
}

export function WinterScene() {
  return (
    <div className="landing-page__winter-scene" aria-hidden="true">
      <img
        className="winter-scene__art"
        src={winterVignette}
        alt=""
        draggable={false}
      />
      <div className="winter-scene__garland">
        {TREES.flatMap((tree, treeIndex) =>
          tree.lights.map((bulb, bulbIndex) => (
            <span
              className="promin-brand__bulb winter-scene__bulb"
              key={`${treeIndex}-${bulbIndex}`}
              style={getBulbStyle(tree, bulb, bulbIndex)}
            />
          )),
        )}
      </div>
    </div>
  );
}
