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
  blue: "var(--p-blue-400)",
  gold: "var(--p-amber-400)",
  green: "var(--p-green-400)",
  red: "var(--p-red-400)",
};

const GARLAND_BULBS: readonly GarlandBulb[] = [
  { color: "red", delay: "-0.1s", x: 3, y: 20 },
  { color: "green", delay: "-1.1s", x: 8, y: 15 },
  { color: "gold", delay: "-0.4s", x: 13, y: 18 },
  { color: "blue", delay: "-1.6s", x: 15, y: 29 },
  { color: "red", delay: "-0.8s", x: 12, y: 42 },
  { color: "green", delay: "-1.4s", x: 5, y: 49 },
  { color: "gold", delay: "-0.5s", x: 18, y: 18 },
  { color: "blue", delay: "-1.2s", x: 24, y: 14 },
  { color: "red", delay: "-0.2s", x: 30, y: 18 },
  { color: "green", delay: "-1.5s", x: 31, y: 29 },
  { color: "gold", delay: "-0.7s", x: 26, y: 39 },
  { color: "blue", delay: "-1.3s", x: 18, y: 46 },
  { color: "red", delay: "-0.3s", x: 28, y: 55 },
  { color: "green", delay: "-1.4s", x: 38, y: 18 },
  { color: "blue", delay: "-0.6s", x: 44, y: 13 },
  { color: "red", delay: "-1.6s", x: 50, y: 20 },
  { color: "gold", delay: "-0.9s", x: 51, y: 30 },
  { color: "green", delay: "-0.2s", x: 47, y: 42 },
  { color: "blue", delay: "-1.1s", x: 41, y: 48 },
  { color: "red", delay: "-0.5s", x: 36, y: 38 },
  { color: "gold", delay: "-1.5s", x: 44, y: 59 },
  { color: "red", delay: "-0.4s", x: 56, y: 18 },
  { color: "gold", delay: "-1.2s", x: 60, y: 31 },
  { color: "blue", delay: "-0.8s", x: 65, y: 17 },
  { color: "green", delay: "-1.6s", x: 69, y: 31 },
  { color: "red", delay: "-0.3s", x: 74, y: 18 },
  { color: "gold", delay: "-1.1s", x: 74, y: 51 },
  { color: "blue", delay: "-0.6s", x: 78, y: 18 },
  { color: "green", delay: "-1.4s", x: 78, y: 38 },
  { color: "red", delay: "-0.1s", x: 78, y: 56 },
  { color: "gold", delay: "-1.3s", x: 84, y: 18 },
  { color: "blue", delay: "-0.7s", x: 84, y: 52 },
  { color: "green", delay: "-1.5s", x: 90, y: 33 },
  { color: "red", delay: "-0.2s", x: 95, y: 18 },
  { color: "gold", delay: "-1.2s", x: 99, y: 52 },
  { color: "blue", delay: "-0.4s", x: 57, y: 73 },
  { color: "gold", delay: "-1.5s", x: 61, y: 70 },
  { color: "red", delay: "-0.8s", x: 66, y: 73 },
  { color: "green", delay: "-1.2s", x: 71, y: 75 },
  { color: "blue", delay: "-0.3s", x: 76, y: 72 },
  { color: "gold", delay: "-1.6s", x: 81, y: 71 },
  { color: "red", delay: "-0.6s", x: 86, y: 74 },
  { color: "green", delay: "-1.4s", x: 91, y: 72 },
  { color: "blue", delay: "-0.1s", x: 96, y: 75 },
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
      <span className="promin-brand__wire promin-brand__wire--p" />
      <span className="promin-brand__wire promin-brand__wire--r" />
      <span className="promin-brand__wire promin-brand__wire--pin" />
      <span className="promin-brand__wire promin-brand__wire--m-left" />
      <span className="promin-brand__wire promin-brand__wire--m-in-left" />
      <span className="promin-brand__wire promin-brand__wire--m-in-right" />
      <span className="promin-brand__wire promin-brand__wire--m-right" />
      <span className="promin-brand__wire promin-brand__wire--i" />
      <span className="promin-brand__wire promin-brand__wire--n-left" />
      <span className="promin-brand__wire promin-brand__wire--n-diagonal" />
      <span className="promin-brand__wire promin-brand__wire--n-right" />
      <span className="promin-brand__wire promin-brand__wire--partner" />
      {GARLAND_BULBS.map((bulb) => (
        <span
          className="promin-brand__bulb"
          key={`${bulb.x}-${bulb.y}`}
          style={getBulbStyle(bulb)}
        />
      ))}
    </span>
  );
}
