import type { ReactNode } from "react";
import { Modal } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { Z_INDEX_FILE_MANAGER_MODAL } from "@editor/styles/zIndex";

/** Unmounts tentative picker state on close; external pickers temporarily own focus. */
export function LibraryPickerModal({
  opened,
  onClose,
  busy = false,
  children,
}: {
  opened: boolean;
  onClose: () => void;
  busy?: boolean;
  children: ReactNode;
}) {
  const mobile = useMediaQuery("(max-width: 640px)") ?? false;
  return (
    <Modal
      opened={opened}
      onClose={() => {
        if (!busy) onClose();
      }}
      fullScreen={mobile}
      size="min(1280px, 94vw)"
      centered
      withCloseButton={false}
      padding={0}
      radius="md"
      zIndex={Z_INDEX_FILE_MANAGER_MODAL}
      trapFocus
      closeOnEscape={!busy}
      closeOnClickOutside={!busy}
    >
      {opened && children}
    </Modal>
  );
}
