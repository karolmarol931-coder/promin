import React from "react";
import { Group } from "@mantine/core";
import { Button } from "@editor/ui/Button";
import { Icon } from "@editor/ui/Icon";
import { useFileActionTerminology } from "@editor/hooks/useFileActionTerminology";
import { CreateProcessingFolderButton } from "@editor/components/policies/CreateProcessingFolderButton";
import ToolButton from "@editor/components/tools/toolPicker/ToolButton";
import { useToolWorkflow } from "@editor/contexts/ToolWorkflowContext";
import { useTranslation } from "react-i18next";

type LandingActionsProps = {
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onUploadClick: () => void;
  onFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
  readerEmpty?: boolean;
};

export function LandingActions({
  fileInputRef,
  onUploadClick,
  onFileSelect,
  readerEmpty = false,
}: LandingActionsProps) {
  const terminology = useFileActionTerminology();
  const { t } = useTranslation();
  const { selectedToolKey, handleToolSelect, toolRegistry } = useToolWorkflow();

  return (
    <>
      <Group
        className="landing-primary-actions"
        gap="sm"
        justify="center"
        wrap="wrap"
        mb="xs"
      >
        <Button
          fat
          leftSection={<Icon name="plus" size="1rem" />}
          onClick={onUploadClick}
        >
          {terminology.uploadFromComputer}
        </Button>

        {!readerEmpty && <CreateProcessingFolderButton />}
      </Group>
      {!readerEmpty && (
        <section
          className="landing-quick-tools"
          aria-label={t("toolPicker.quickAccess", "Quick access")}
        >
          <div className="landing-quick-tools__heading">
            {t("toolPicker.quickAccess", "Quick access")}
          </div>
          <div className="landing-quick-tools__grid">
            {(["merge", "split"] as const).map((id) => {
              const tool = toolRegistry[id];
              if (!tool) return null;

              return (
                <div className="landing-quick-tools__item" key={id}>
                  <ToolButton
                    id={id}
                    tool={tool}
                    isSelected={selectedToolKey === id}
                    onSelect={handleToolSelect}
                    showDescription
                  />
                </div>
              );
            })}
          </div>
        </section>
      )}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={onFileSelect}
        style={{ display: "none" }}
      />
    </>
  );
}
