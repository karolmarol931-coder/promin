import React from "react";
import { Container } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { useFileHandler } from "@editor/hooks/useFileHandler";
import { openFilesFromDisk } from "@editor/services/openFilesFromDisk";
import { LandingActions } from "@editor/components/shared/LandingActions";
import { LandingBrand } from "@editor/components/shared/LandingBrand";
import { WinterScene } from "@editor/components/shared/WinterScene";
import winterFloor from "@editor/assets/seasonal/winter-floor.svg";
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
      className="landing-page flex min-h-0 flex-col"
      style={{ position: "relative" }}
    >
      {!readerEmpty && (
        <>
          <img
            className="landing-page__snow-floor"
            src={winterFloor}
            alt=""
            draggable={false}
            aria-hidden="true"
          />
          <WinterScene />
        </>
      )}
      <div className="landing-page__content">
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
