import React, { useState } from "react";
import {
  Accordion,
  Group,
  Text,
  Stack,
  Select,
  ScrollArea,
} from "@mantine/core";
import { Button } from "@editor/ui/Button";
import { ActionIcon } from "@editor/ui/ActionIcon";
import { useTranslation } from "react-i18next";
import { Icon } from "@editor/ui/Icon";
import { Z_INDEX_AUTOMATE_DROPDOWN } from "@editor/styles/zIndex";
import type { FileId } from "@editor/types/file";
import type { StirlingFile } from "@editor/types/fileContext";
import type {
  MergeMoveDirection,
  MergeSortType,
} from "@editor/tools/merge/fileOrder";

interface MergeFileSorterProps {
  files?: StirlingFile[];
  onSortFiles: (sortType: MergeSortType, ascending: boolean) => void;
  onMoveFile?: (fileId: FileId, direction: MergeMoveDirection) => void;
  onReorderFile?: (
    fileId: FileId,
    targetFileId: FileId,
    afterTarget: boolean,
  ) => void;
  disabled?: boolean;
}

const MergeFileSorter: React.FC<MergeFileSorterProps> = ({
  files = [],
  onSortFiles,
  onMoveFile,
  onReorderFile,
  disabled = false,
}) => {
  const { t } = useTranslation();
  const [sortType, setSortType] = useState<MergeSortType>("filename");
  const [ascending, setAscending] = useState(true);
  const [draggedFileId, setDraggedFileId] = useState<FileId | null>(null);

  const sortOptions = [
    { value: "filename", label: t("merge.sortBy.filename", "File Name") },
    {
      value: "dateModified",
      label: t("merge.sortBy.dateModified", "Date Modified"),
    },
  ];

  const handleSort = () => {
    onSortFiles(sortType, ascending);
  };

  const handleDirectionToggle = () => {
    setAscending(!ascending);
  };

  return (
    <Stack gap="xs">
      <Text size="sm" fw={500}>
        {t(
          "merge.sortBy.description",
          "Files merge from top to bottom. Drag to reorder or use the arrows.",
        )}
      </Text>
      {files.length > 0 && (
        <Stack gap="xs">
          <Group justify="space-between" align="center" gap="xs">
            <Text size="sm" fw={500}>
              {t("merge.sortBy.orderLabel", "Merge order")}
            </Text>
            {files.length > 1 && !disabled && (
              <Button
                variant="secondary"
                size="sm"
                leftSection={<Icon name="list-sort-descending" />}
                onClick={handleSort}
              >
                {t("merge.sortBy.sort", "Sort")}
              </Button>
            )}
          </Group>
          <ScrollArea.Autosize mah={260} type="auto">
            <Stack
              component="ol"
              gap="xs"
              p={0}
              m={0}
              aria-label={t("merge.sortBy.orderLabel", "Merge order")}
              style={{ listStyle: "none" }}
            >
              {files.map((file, index) => (
                <Group
                  key={file.fileId}
                  component="li"
                  wrap="nowrap"
                  gap="xs"
                  justify="space-between"
                  p="xs"
                  draggable={!disabled && Boolean(onReorderFile)}
                  onDragStart={(event) => {
                    setDraggedFileId(file.fileId);
                    event.dataTransfer.effectAllowed = "move";
                    event.dataTransfer.setData("text/plain", file.fileId);
                  }}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault();
                    if (draggedFileId && onReorderFile) {
                      const bounds =
                        event.currentTarget.getBoundingClientRect();
                      onReorderFile(
                        draggedFileId,
                        file.fileId,
                        event.clientY > bounds.top + bounds.height / 2,
                      );
                    }
                    setDraggedFileId(null);
                  }}
                  onDragEnd={() => setDraggedFileId(null)}
                  style={{
                    border: "1px solid var(--c-border-subtle)",
                    borderRadius: "var(--radius-sm)",
                    minWidth: 0,
                    cursor: !disabled && onReorderFile ? "grab" : undefined,
                  }}
                  title={
                    !disabled && onReorderFile
                      ? t("merge.sortBy.dragToReorder", "Drag to reorder")
                      : undefined
                  }
                >
                  <Group
                    wrap="nowrap"
                    gap="xs"
                    style={{ minWidth: 0, flex: 1 }}
                  >
                    <Text size="xs" c="dimmed" aria-hidden="true">
                      {index + 1}.
                    </Text>
                    <Text size="sm" truncate title={file.name}>
                      {file.name}
                    </Text>
                  </Group>
                  {onMoveFile && (
                    <Group wrap="nowrap" gap={2}>
                      <ActionIcon
                        variant="secondary"
                        size="sm"
                        aria-label={t("merge.sortBy.moveUp", {
                          fileName: file.name,
                          defaultValue: "Move {{fileName}} up",
                        })}
                        onClick={() => onMoveFile(file.fileId, "up")}
                        disabled={disabled || index === 0}
                      >
                        <Icon name="arrow-up" />
                      </ActionIcon>
                      <ActionIcon
                        variant="secondary"
                        size="sm"
                        aria-label={t("merge.sortBy.moveDown", {
                          fileName: file.name,
                          defaultValue: "Move {{fileName}} down",
                        })}
                        onClick={() => onMoveFile(file.fileId, "down")}
                        disabled={disabled || index === files.length - 1}
                      >
                        <Icon name="arrow-down" />
                      </ActionIcon>
                    </Group>
                  )}
                </Group>
              ))}
            </Stack>
          </ScrollArea.Autosize>
        </Stack>
      )}
      <Accordion variant="contained" radius="sm">
        <Accordion.Item value="sort">
          <Accordion.Control>
            {t("merge.sortBy.advancedOptions", "More sorting options")}
          </Accordion.Control>
          <Accordion.Panel>
            <Stack gap="xs">
              <Group gap="xs" align="end" justify="space-between">
                <Select
                  data={sortOptions}
                  value={sortType}
                  onChange={(value) =>
                    setSortType(
                      value === "dateModified" ? "dateModified" : "filename",
                    )
                  }
                  disabled={disabled}
                  label={t("merge.sortBy.label", "Sort By")}
                  size="xs"
                  style={{ flex: 1 }}
                  comboboxProps={{
                    withinPortal: true,
                    zIndex: Z_INDEX_AUTOMATE_DROPDOWN,
                  }}
                />

                <ActionIcon
                  variant="secondary"
                  size="sm"
                  onClick={handleDirectionToggle}
                  disabled={disabled}
                  title={
                    ascending
                      ? t("merge.sortBy.ascending", "Ascending")
                      : t("merge.sortBy.descending", "Descending")
                  }
                  aria-label={
                    ascending
                      ? t("merge.sortBy.ascending", "Ascending")
                      : t("merge.sortBy.descending", "Descending")
                  }
                >
                  {ascending ? (
                    <Icon name="arrow-up" />
                  ) : (
                    <Icon name="arrow-down" />
                  )}
                </ActionIcon>
              </Group>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>
    </Stack>
  );
};

export default MergeFileSorter;
