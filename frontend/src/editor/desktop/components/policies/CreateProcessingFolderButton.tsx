import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@editor/ui/Button";
import { Icon } from "@editor/ui/Icon";
import { useToast } from "@editor/components/toast/ToastContext";
import { useFileHandler } from "@editor/hooks/useFileHandler";
import { pickDirectory } from "@editor/services/directoryPicker";
import { importPdfFolder } from "@editor/services/pdfFolderImport";

export function CreateProcessingFolderButton() {
  const { t } = useTranslation();
  const toast = useToast();
  const { addFiles } = useFileHandler();
  const [loading, setLoading] = useState(false);

  const handleSelectFolder = async () => {
    let folder: Awaited<ReturnType<typeof pickDirectory>>;
    try {
      folder = await pickDirectory();
    } catch (error) {
      toast.show({
        title: t(
          "fileEditor.folderImport.failed",
          "Не удалось загрузить папку",
        ),
        body: error instanceof Error ? error.message : undefined,
        alertType: "error",
      });
      return;
    }
    if (!folder) return;

    setLoading(true);
    const toastId = toast.show({
      title: t("fileEditor.folderImport.searching", "Ищу PDF-файлы в папке…"),
      alertType: "neutral",
      isPersistentPopup: true,
      progressBarPercentage: 0,
    });

    try {
      const result = await importPdfFolder(
        folder.path,
        (files) => addFiles(files),
        (completed, total) =>
          toast.updateProgress(
            toastId,
            total === 0 ? 100 : (completed / total) * 100,
          ),
      );

      if (result.imported === 0) {
        toast.update(toastId, {
          title: t(
            "fileEditor.folderImport.empty",
            "В папке не найдено PDF-файлов для загрузки.",
          ),
          body:
            result.skipped > 0
              ? t("fileEditor.folderImport.skipped", {
                  count: result.skipped,
                  defaultValue: "Не удалось прочитать PDF-файлов: {{count}}.",
                  imported: 0,
                })
              : undefined,
          alertType: result.skipped > 0 ? "warning" : "neutral",
          isPersistentPopup: false,
        });
        return;
      }

      toast.update(toastId, {
        title: t("fileEditor.folderImport.complete", "PDF-файлы добавлены"),
        body:
          result.skipped > 0
            ? t("fileEditor.folderImport.skipped", {
                count: result.skipped,
                defaultValue:
                  "Добавлено: {{imported}}. Не удалось прочитать: {{count}}.",
                imported: result.imported,
              })
            : t(
                "fileEditor.folderImport.nextStep",
                "Теперь выберите инструмент справа.",
              ),
        alertType: result.skipped > 0 ? "warning" : "success",
        isPersistentPopup: false,
      });
    } catch (error) {
      toast.update(toastId, {
        title: t(
          "fileEditor.folderImport.failed",
          "Не удалось загрузить папку",
        ),
        body: error instanceof Error ? error.message : undefined,
        alertType: "error",
        isPersistentPopup: false,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      fat
      variant="secondary"
      loading={loading}
      disabled={loading}
      leftSection={<Icon name="folder-plus" size="1rem" />}
      onClick={(event) => {
        event.stopPropagation();
        void handleSelectFolder();
      }}
    >
      {t("fileEditor.folderImport.addPdfFolder", "Добавить PDF из папки")}
    </Button>
  );
}
