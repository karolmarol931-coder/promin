import { type KeyboardEvent as ReactKeyboardEvent } from "react";
import { Stack, Text, Box, Group, Center } from "@mantine/core";
import { ActionIcon } from "@editor/ui/ActionIcon";
import { useTranslation } from "react-i18next";
import { Icon } from "@editor/ui/Icon";
import { RotateParametersHook } from "@editor/hooks/tools/rotate/useRotateParameters";
import { useViewScopedFileStubs } from "@editor/hooks/tools/shared/useViewScopedFiles";
import DocumentThumbnail from "@editor/components/shared/filePreview/DocumentThumbnail";
import { Button } from "@editor/ui/Button";

interface RotateSettingsProps {
  parameters: RotateParametersHook;
  disabled?: boolean;
}

const RotateSettings = ({
  parameters,
  disabled = false,
}: RotateSettingsProps) => {
  const { t } = useTranslation();
  // Preview the document the rotation will actually apply to, so it follows
  // the viewer when the user switches files with the tool open.
  const [previewStub = null] = useViewScopedFileStubs();

  // Calculate current angle display
  const currentAngle = parameters.parameters.angle;
  const displayedAngle = ((currentAngle % 360) + 360) % 360;

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (
      event.target !== event.currentTarget ||
      event.metaKey ||
      event.ctrlKey ||
      event.altKey ||
      event.shiftKey
    ) {
      return;
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      parameters.rotateAnticlockwise();
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      parameters.rotateClockwise();
    }
  };

  return (
    <Stack
      gap="md"
      role="region"
      aria-label={t("rotate.preview.controls", "Rotation controls")}
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      {/* Thumbnail Preview Section */}
      <Stack gap="xs">
        <Text size="sm" fw={500}>
          {t("rotate.preview.title", "Rotation Preview")}
        </Text>

        <Center>
          <Box
            style={{
              width: "280px",
              height: "280px",
              border: "1px solid var(--mantine-color-gray-3)",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "var(--mantine-color-gray-0)",
              overflow: "hidden",
            }}
          >
            <Box
              style={{
                width: "100%",
                height: "100%",
                transform: `rotate(${currentAngle}deg)`,
                transition: "transform 0.3s ease-in-out",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <DocumentThumbnail
                file={previewStub}
                thumbnail={previewStub?.thumbnailUrl ?? null}
              />
            </Box>
          </Box>
        </Center>
      </Stack>

      <Group justify="center" gap="sm">
        <Text size="sm" fw={600} aria-live="polite">
          {t("rotate.preview.angle", "Rotation: {{angle}}°", {
            angle: displayedAngle,
          })}
        </Text>
        <Button
          variant="tertiary"
          size="sm"
          onClick={() => parameters.updateParameter("angle", 0)}
          disabled={disabled || displayedAngle === 0}
        >
          {t("rotate.preview.reset", "Reset")}
        </Button>
      </Group>
      <Text size="xs" c="dimmed" ta="center">
        {t(
          "rotate.preview.keyboardHint",
          "Use ← or → when this panel is focused.",
        )}
      </Text>

      {/* Rotation Controls */}
      <Group justify="center" gap="lg">
        <ActionIcon
          size="lg"
          variant="secondary"
          onClick={parameters.rotateAnticlockwise}
          disabled={disabled}
          aria-label={t("rotate.rotateLeft", "Rotate Anticlockwise")}
          title={t("rotate.rotateLeft", "Rotate Anticlockwise")}
        >
          <Icon name="rotate-ccw" size={"1.5rem"} />
        </ActionIcon>

        <ActionIcon
          size="lg"
          variant="secondary"
          onClick={parameters.rotateClockwise}
          disabled={disabled}
          aria-label={t("rotate.rotateRight", "Rotate Clockwise")}
          title={t("rotate.rotateRight", "Rotate Clockwise")}
        >
          <Icon name="rotate-cw" size={"1.5rem"} />
        </ActionIcon>
      </Group>
    </Stack>
  );
};

export default RotateSettings;
