import { useSaveShortcut } from "@editor/hooks/useSaveShortcut";
import { useExitWarning } from "@editor/hooks/useExitWarning";
import { useNewWindowShortcut } from "@editor/hooks/useNewWindowShortcut";
import { useOpenWindowFiles } from "@editor/hooks/useOpenWindowFiles";
import { useDiskWatcher } from "@editor/hooks/useDiskWatcher";
import { useDesktopUpdateCheck } from "@editor/hooks/useDesktopUpdateCheck";

/**
 * Desktop-only component that sets up keyboard shortcuts and exit warnings
 * - Cmd+S to save selected files
 * - Cmd+N to open an empty new window
 * - Loads files queued for this window ("Open in new window" from My Files)
 * - Warning on app exit if unsaved files
 * - Watches open files' disk originals for external edits and deletions
 * Renders nothing, just sets up the listeners
 */
export function SaveShortcutListener() {
  useSaveShortcut();
  useNewWindowShortcut();
  useOpenWindowFiles();
  useExitWarning();
  useDiskWatcher();
  useDesktopUpdateCheck();
  return null;
}
