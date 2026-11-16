import prominMark from "@editor/assets/brand/promin/promin-location-mark.svg";
import "@editor/components/chat/ChatPanel.css";

export function StirlingLogoAnimated({ size = 20 }: { size?: number }) {
  return (
    <img
      src={prominMark}
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
    />
  );
}
