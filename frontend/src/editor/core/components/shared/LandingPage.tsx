import React from "react";
import { Container } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { useFileHandler } from "@editor/hooks/useFileHandler";
import { openFilesFromDisk } from "@editor/services/openFilesFromDisk";
import { LandingActions } from "@editor/components/shared/LandingActions";
import { LandingBrand } from "@editor/components/shared/LandingBrand";
import "@editor/components/shared/LandingPage.css";

const LandingPage = ({ readerEmpty = false }: { readerEmpty?: boolean }) => {
  const { t } = useTranslation();
  const { addFiles } = useFileHandler();
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const handleNativeUploadClick = async () => {
    const files = await openFilesFromDisk({
      multiple: true,
      onFallbackOpen: () => fileInputRef.current?.click(),
    });
    if (files.length > 0) {
      await addFiles(files);
    }
  };

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 0) {
      await addFiles(files);
    }
    event.target.value = "";
  };

  return (
    <Container
      size="70rem"
      p={0}
      h="100%"
      className="flex min-h-0 flex-col"
      style={{ position: "relative" }}
    >
      <div className="flex min-h-0 w-full flex-1 flex-col items-center justify-center overflow-visible px-4 py-8">
        {readerEmpty ? (
          <h1 className="landing-reader-empty-title">
            {t("reader.emptyTitle", "Open a PDF to start reading")}
          </h1>
        ) : (
          <LandingBrand />
        )}

        <div className="landing-actions-enter">
          <LandingActions
            fileInputRef={fileInputRef}
            onUploadClick={() => void handleNativeUploadClick()}
            onFileSelect={handleFileSelect}
            readerEmpty={readerEmpty}
          />
        </div>
      </div>
    </Container>
  );
};

export default LandingPage;
