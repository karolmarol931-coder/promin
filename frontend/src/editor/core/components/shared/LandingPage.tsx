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
      className="landing-page flex min-h-0 flex-col"
      style={{ position: "relative" }}
    >
      {!readerEmpty && (
        <div className="landing-page__winter-scene" aria-hidden="true">
          <div className="winter-tree winter-tree--back">
            <span className="winter-tree__trunk" />
            <span className="winter-tree__layer winter-tree__layer--lower" />
            <span className="winter-tree__layer winter-tree__layer--middle" />
            <span className="winter-tree__layer winter-tree__layer--upper" />
          </div>
          <div className="winter-tree winter-tree--front">
            <span className="winter-tree__trunk" />
            <span className="winter-tree__layer winter-tree__layer--lower" />
            <span className="winter-tree__layer winter-tree__layer--middle" />
            <span className="winter-tree__layer winter-tree__layer--upper" />
          </div>
          <div className="winter-snowman">
            <span className="winter-snowman__arm winter-snowman__arm--left" />
            <span className="winter-snowman__arm winter-snowman__arm--right" />
            <span className="winter-snowman__base" />
            <span className="winter-snowman__body" />
            <span className="winter-snowman__head" />
            <span className="winter-snowman__nose" />
            <span className="winter-snowman__hat" />
            <span className="winter-snowman__scarf" />
          </div>
        </div>
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
