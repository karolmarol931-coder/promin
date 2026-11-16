import { useEffect, type ReactNode } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { isTauri } from "@tauri-apps/api/core";
import styles from "@editor/components/layout/TitleBarStrip.module.css";

interface TitleBarStripProps {
  children?: ReactNode;
}

export function TitleBarStrip({ children }: TitleBarStripProps) {
  useEffect(() => {
    if (!isTauri()) return;

    const DOUBLE_CLICK_MS = 500;
    const DRAG_THRESHOLD_PX = 4;
    const INTERACTIVE =
      "button, a[href], input, textarea, select, label, summary," +
      '[role="button"], [role="tab"], [role="menuitem"], [role="switch"],' +
      '[role="slider"], [contenteditable="true"], [data-no-window-drag]';
    const draggableAt = (event: MouseEvent) => {
      if (event.button !== 0) return false;
      const element = event.target as Element | null;
      if (!element?.closest("[data-title-bar-strip]")) return false;
      return !element.closest(INTERACTIVE);
    };
    let pending: { x: number; y: number } | null = null;
    let lastDownAt = 0;
    const onMouseDown = (event: MouseEvent) => {
      if (!draggableAt(event)) {
        pending = null;
        return;
      }
      const now = Date.now();
      if (now - lastDownAt < DOUBLE_CLICK_MS) {
        pending = null;
        lastDownAt = 0;
        void getCurrentWindow().toggleMaximize();
        return;
      }
      lastDownAt = now;
      pending = { x: event.clientX, y: event.clientY };
    };
    const onMouseMove = (event: MouseEvent) => {
      if (!pending) return;
      if (
        Math.abs(event.clientX - pending.x) > DRAG_THRESHOLD_PX ||
        Math.abs(event.clientY - pending.y) > DRAG_THRESHOLD_PX
      ) {
        pending = null;
        lastDownAt = 0;
        void getCurrentWindow().startDragging();
      }
    };
    const onMouseUp = () => {
      pending = null;
    };
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  return (
    <div className={styles.strip} data-title-bar-strip>
      {children}
    </div>
  );
}
