import { useEffect } from "react";
import { fileOpenService } from "@editor/services/fileOpenService";

/**
 * Cmd+N opens an empty window in the same Tauri process and shares the bundled
 * backend.
 *
 * The macOS app only loads this listener inside its native window.
 */
export function useNewWindowShortcut() {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return;
      if (
        event.metaKey &&
        !event.shiftKey &&
        !event.altKey &&
        event.key.toLowerCase() === "n"
      ) {
        event.preventDefault();
        fileOpenService.openInNewWindow([]);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);
}
