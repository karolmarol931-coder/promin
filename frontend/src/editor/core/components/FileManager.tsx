import { useState } from "react";
import { useFilesModalContext } from "@editor/contexts/FilesModalContext";
import { LibraryFilePicker } from "@editor/components/filesPage/LibraryFilePicker";
import { LibraryPickerModal } from "@editor/components/filesPage/LibraryPickerModal";

interface FileManagerProps {
  selectedTool?: { supportedFormats?: string[] } | null;
}

/** Unmounting discards tentative selections; file ingestion remains owned by FilesModalContext. */
export default function FileManager({ selectedTool }: FileManagerProps) {
  const { isFilesModalOpen, closeFilesModal, supportedFormats } =
    useFilesModalContext();
  const [busy, setBusy] = useState(false);
  return (
    <LibraryPickerModal
      opened={isFilesModalOpen}
      onClose={closeFilesModal}
      busy={busy}
    >
      {isFilesModalOpen && (
        <LibraryFilePicker
          supportedFormats={supportedFormats ?? selectedTool?.supportedFormats}
          onBusyChange={setBusy}
        />
      )}
    </LibraryPickerModal>
  );
}
