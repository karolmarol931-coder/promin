import React, { useMemo, useRef } from "react";
import { Box, Stack } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { Button } from "@editor/ui/Button";
import { ToolRegistryEntry } from "@editor/data/toolsTaxonomy";
import "@editor/components/tools/toolPicker/ToolPicker.css";
import { useToolSections } from "@editor/hooks/useToolSections";
import type { SubcategoryGroup } from "@editor/hooks/useToolSections";
import { useFavoriteToolItems } from "@editor/hooks/tools/useFavoriteToolItems";
import NoToolsFound from "@editor/components/tools/shared/NoToolsFound";
import { renderToolButtons } from "@editor/components/tools/shared/renderToolButtons";
import ToolButton from "@editor/components/tools/toolPicker/ToolButton";
import { LazyToolSection } from "@editor/components/tools/toolPicker/LazyToolSection";
import {
  useToolWorkflowData,
  useToolWorkflowFavorites,
} from "@editor/contexts/ToolWorkflowContext";
import { useToolRegistry } from "@editor/contexts/ToolRegistryContext";
import { ToolId } from "@editor/types/toolId";
import { getSubcategoryLabel } from "@editor/data/toolsTaxonomy";
import { ToolPickerFooterExtensions } from "@editor/components/tools/toolPicker/ToolPickerFooterExtensions";

interface ToolPickerProps {
  selectedToolKey: string | null;
  onSelect: (id: string) => void;
  filteredTools: Array<{
    item: [ToolId, ToolRegistryEntry];
    matchedText?: string;
  }>;
  isSearching?: boolean;
  /** Compact "resting" view: favourites + recommended only, with a button to expand. */
  compact?: boolean;
  /** Called when the user clicks "View all tools" in compact mode. */
  onShowAllTools?: () => void;
}

const EMPTY_FILTERED_TOOLS: ToolPickerProps["filteredTools"] = [];
const HEADER_TEXT_STYLE: React.CSSProperties = {
  fontSize: "0.68rem",
  fontWeight: 600,
  padding: "0.25rem 0 0.35rem 0.5rem",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  color: "var(--c-text-subtle)",
};
const SCROLLABLE_STYLE: React.CSSProperties = {
  flex: 1,
  overflowY: "auto",
  overflowX: "hidden",
  minHeight: 0,
  height: "100%",
  marginTop: -2,
};
const CONTAINER_STYLE: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  background: "var(--c-surface)",
};
const toTitleCase = (s: string) =>
  s.replace(
    /\w\S*/g,
    (txt) => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase(),
  );

const ToolPicker = ({
  selectedToolKey,
  onSelect,
  filteredTools,
  isSearching = false,
  compact = false,
  onShowAllTools,
}: ToolPickerProps) => {
  const { t } = useTranslation();

  const scrollerRef = useRef<HTMLDivElement | null>(null);

  const { sections: visibleSections } = useToolSections(filteredTools);
  const { toolRegistry } = useToolWorkflowData();
  const { allTools } = useToolRegistry();
  const { favoriteTools } = useToolWorkflowFavorites();

  const compactCatalogTools = useMemo<ToolPickerProps["filteredTools"]>(
    () =>
      Object.entries(allTools).map(([id, tool]) => ({
        item: [id as ToolId, tool],
      })),
    [allTools],
  );
  const { sections: compactCatalogSections } =
    useToolSections(compactCatalogTools);
  const compactToolRegistry = compact ? allTools : toolRegistry;
  const favoriteToolItems = useFavoriteToolItems(
    favoriteTools,
    compactToolRegistry,
  );

  const quickSection = useMemo(
    () =>
      (compact ? compactCatalogSections : visibleSections).find(
        (section) => section.key === "quick",
      ),
    [compact, compactCatalogSections, visibleSections],
  );

  const recommendedItems = useMemo(() => {
    const items: Array<{ id: ToolId; tool: ToolRegistryEntry }> = [];
    quickSection?.subcategories.forEach((sc: SubcategoryGroup) =>
      sc.tools.forEach((toolEntry) => items.push(toolEntry)),
    );
    return items;
  }, [quickSection]);

  const favoriteToolIds = useMemo<Set<ToolId>>(
    () => new Set(favoriteToolItems.map(({ id }) => id)),
    [favoriteToolItems],
  );
  const compactRecommendedItems = useMemo(
    () => recommendedItems.filter(({ id }) => !favoriteToolIds.has(id)),
    [favoriteToolIds, recommendedItems],
  );

  const allSection = useMemo(
    () => visibleSections.find((s) => s.key === "all"),
    [visibleSections],
  );

  // Build flat list by subcategory for search mode
  const effectiveFilteredForSearch: ToolPickerProps["filteredTools"] =
    isSearching ? filteredTools : EMPTY_FILTERED_TOOLS;
  const { searchGroups } = useToolSections(effectiveFilteredForSearch);

  return (
    <Box h="100%" style={CONTAINER_STYLE}>
      <Box
        ref={scrollerRef}
        style={SCROLLABLE_STYLE}
        className="tool-picker-scrollable"
      >
        {isSearching ? (
          <Stack p="sm" gap="xs">
            {searchGroups.length === 0 ? (
              <NoToolsFound />
            ) : (
              searchGroups.map((group) =>
                renderToolButtons(
                  t,
                  group,
                  selectedToolKey,
                  onSelect,
                  true,
                  false,
                  filteredTools,
                  true,
                  favoriteToolIds,
                ),
              )
            )}
          </Stack>
        ) : compact ? (
          <Box className="tool-picker__compact">
            {favoriteToolItems.length > 0 && (
              <>
                <div style={HEADER_TEXT_STYLE}>
                  {t("toolPanel.fullscreen.favorites", "Favourites")}
                </div>
                <div className="tool-picker__compact-list">
                  {favoriteToolItems.map(({ id, tool }) => (
                    <ToolButton
                      key={`fav-${id}`}
                      id={id}
                      tool={tool}
                      isSelected={selectedToolKey === id}
                      onSelect={onSelect}
                      hasStars
                      isFavorited
                      showDescription
                    />
                  ))}
                </div>
              </>
            )}
            {compactRecommendedItems.length > 0 && (
              <>
                <div style={HEADER_TEXT_STYLE}>
                  {t("toolPanel.fullscreen.recommended", "Recommended")}
                </div>
                <div className="tool-picker__compact-list">
                  {compactRecommendedItems.map(({ id, tool }) => (
                    <ToolButton
                      key={`rec-${id}`}
                      id={id}
                      tool={tool}
                      isSelected={selectedToolKey === id}
                      onSelect={onSelect}
                      hasStars
                      isFavorited={false}
                      showDescription
                    />
                  ))}
                </div>
              </>
            )}
            {favoriteToolItems.length === 0 &&
            compactRecommendedItems.length === 0 ? (
              <NoToolsFound />
            ) : null}
          </Box>
        ) : (
          <>
            {/* All-tools view: favourites + recommended + all subcategories. */}
            <Stack px="sm" pb="sm" pt={4} gap="xs">
              {favoriteToolItems.length > 0 && (
                <Box w="100%">
                  <div style={HEADER_TEXT_STYLE}>
                    {t("toolPanel.fullscreen.favorites", "Favourites")}
                  </div>
                  <div>
                    {favoriteToolItems.map(({ id, tool }) => (
                      <ToolButton
                        key={`fav-${id}`}
                        id={id}
                        tool={tool}
                        isSelected={selectedToolKey === id}
                        onSelect={onSelect}
                        hasStars
                        isFavorited
                      />
                    ))}
                  </div>
                </Box>
              )}
              {recommendedItems.length > 0 && (
                <Box w="100%">
                  <div style={HEADER_TEXT_STYLE}>
                    {t("toolPanel.fullscreen.recommended", "Recommended")}
                  </div>
                  <div>
                    {recommendedItems.map(({ id, tool }) => (
                      <ToolButton
                        key={`rec-${id}`}
                        id={id}
                        tool={tool}
                        isSelected={selectedToolKey === id}
                        onSelect={onSelect}
                        hasStars
                        isFavorited={favoriteToolIds.has(id)}
                      />
                    ))}
                  </div>
                </Box>
              )}
              {allSection &&
                allSection.subcategories.map((sc: SubcategoryGroup) => (
                  <LazyToolSection
                    key={sc.subcategoryId}
                    estimatedHeight={32 + sc.tools.length * 44}
                    scrollRoot={scrollerRef}
                    label={toTitleCase(
                      getSubcategoryLabel(t, sc.subcategoryId),
                    )}
                  >
                    <Box w="100%">
                      <div style={HEADER_TEXT_STYLE}>
                        {toTitleCase(getSubcategoryLabel(t, sc.subcategoryId))}
                      </div>
                      {renderToolButtons(
                        t,
                        sc,
                        selectedToolKey,
                        onSelect,
                        false,
                        false,
                        undefined,
                        true,
                        favoriteToolIds,
                      )}
                    </Box>
                  </LazyToolSection>
                ))}
            </Stack>

            {!quickSection && !allSection && <NoToolsFound />}

            <div aria-hidden style={{ height: 200 }} />
          </>
        )}
      </Box>
      {compact && onShowAllTools && (
        <div className="tool-picker__compact-footer">
          <Button
            variant="tertiary"
            size="sm"
            fullWidth
            onClick={onShowAllTools}
            aria-label={t("toolPanel.viewAllTools", "View all tools")}
          >
            {t("toolPanel.viewAllTools", "View all tools")}
          </Button>
        </div>
      )}
      <ToolPickerFooterExtensions />
    </Box>
  );
};

export default ToolPicker;
