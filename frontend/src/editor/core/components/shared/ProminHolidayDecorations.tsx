import type { CSSProperties } from "react";

type GarlandBulbColor = "blue" | "gold" | "green" | "red";

interface GarlandBulb {
  color: GarlandBulbColor;
  delay: string;
  x: number;
  y: number;
}

type GarlandBulbStyle = CSSProperties & {
  "--bulb-color": string;
  "--garland-delay": string;
  "--garland-x": string;
  "--garland-y": string;
};

const BULB_COLORS: Record<GarlandBulbColor, string> = {
  blue: "var(--c-seasonal-bulb-blue)",
  gold: "var(--c-seasonal-bulb-gold)",
  green: "var(--c-seasonal-bulb-green)",
  red: "var(--c-seasonal-bulb-red)",
};

const GARLAND_BULBS: readonly GarlandBulb[] = [
  { color: "red", delay: "-0.1s", x: 2, y: 50 },
  { color: "green", delay: "-1.1s", x: 2, y: 12 },
  { color: "gold", delay: "-0.4s", x: 9, y: 10 },
  { color: "blue", delay: "-1.6s", x: 14, y: 17 },
  { color: "red", delay: "-0.8s", x: 13, y: 43 },
  { color: "gold", delay: "-0.5s", x: 17, y: 50 },
  { color: "blue", delay: "-1.2s", x: 17, y: 13 },
  { color: "red", delay: "-0.2s", x: 23, y: 10 },
  { color: "green", delay: "-1.5s", x: 29, y: 15 },
  { color: "gold", delay: "-0.7s", x: 29, y: 40 },
  { color: "blue", delay: "-1.3s", x: 23, y: 58 },
  { color: "red", delay: "-0.3s", x: 36, y: 37 },
  { color: "green", delay: "-1.4s", x: 39, y: 19 },
  { color: "blue", delay: "-0.6s", x: 44, y: 15 },
  { color: "red", delay: "-1.6s", x: 49, y: 22 },
  { color: "gold", delay: "-0.9s", x: 49, y: 42 },
  { color: "green", delay: "-0.2s", x: 44, y: 53 },
  { color: "blue", delay: "-1.1s", x: 56, y: 51 },
  { color: "red", delay: "-0.5s", x: 58, y: 14 },
  { color: "gold", delay: "-1.5s", x: 65, y: 42 },
  { color: "green", delay: "-1.6s", x: 72, y: 14 },
  { color: "red", delay: "-0.3s", x: 74, y: 50 },
  { color: "blue", delay: "-0.6s", x: 78, y: 17 },
  { color: "gold", delay: "-1.1s", x: 78, y: 47 },
  { color: "green", delay: "-1.4s", x: 84, y: 50 },
  { color: "red", delay: "-0.2s", x: 85, y: 13 },
  { color: "blue", delay: "-1.5s", x: 92, y: 32 },
  { color: "gold", delay: "-0.7s", x: 98, y: 14 },
  { color: "green", delay: "-1.2s", x: 98, y: 48 },
  { color: "red", delay: "-0.4s", x: 57, y: 72 },
  { color: "gold", delay: "-1.5s", x: 64, y: 88 },
  { color: "blue", delay: "-0.8s", x: 72, y: 72 },
  { color: "green", delay: "-1.2s", x: 80, y: 88 },
  { color: "red", delay: "-0.3s", x: 89, y: 72 },
  { color: "gold", delay: "-1.6s", x: 98, y: 88 },
];

function getBulbStyle({ color, delay, x, y }: GarlandBulb): GarlandBulbStyle {
  return {
    "--bulb-color": BULB_COLORS[color],
    "--garland-delay": delay,
    "--garland-x": `${x}%`,
    "--garland-y": `${y}%`,
  };
}

export function ProminHolidayDecorations() {
  return (
    <span className="promin-brand__garland" aria-hidden="true">
      {GARLAND_BULBS.map((bulb) => (
        <span className="promin-brand__bulb" key={`${bulb.x}-${bulb.y}`} style={getBulbStyle(bulb)} />
      ))}
    </span>
  );
}
