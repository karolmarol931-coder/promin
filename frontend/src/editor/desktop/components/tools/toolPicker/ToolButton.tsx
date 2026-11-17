import { memo } from "react";
import CoreToolButton from "@editor-core/components/tools/toolPicker/ToolButton";
import { getToolDisabledReason } from "@editor/components/tools/fullscreen/shared";
import { useToolWorkflowData } from "@editor/contexts/ToolWorkflowContext";
import { useAppConfig } from "@editor/contexts/AppConfigContext";
import { useLocalProcessingOnly } from "@editor/hooks/useLocalProcessingOnly";

type CoreToolButtonProps = React.ComponentProps<typeof CoreToolButton>;

/** Keeps tools that cannot run on this device out of the local tool list. */
const ToolButton: React.FC<CoreToolButtonProps> = (props) => {
  const { toolAvailability } = useToolWorkflowData();
  const { config } = useAppConfig();
  const localOnly = useLocalProcessingOnly();
  const premiumEnabled = config?.premiumEnabled;

  const disabledReason = getToolDisabledReason(
    props.id,
    props.tool,
    toolAvailability,
    premiumEnabled,
  );
  // Endpoint checks finish after first paint, so compact rows stay stable while they settle.
  const keepCompactEndpointRow =
    props.showDescription &&
    Boolean(props.tool.endpoints?.length) &&
    (props.tool.component !== null ||
      props.id === "read" ||
      props.id === "multiTool");
  const isUnavailable =
    props.tool.hiddenFromToolList || disabledReason !== null;

  if (
    localOnly &&
    (props.tool.link || (isUnavailable && !keepCompactEndpointRow))
  ) {
    return null;
  }

  return <CoreToolButton {...props} />;
};

export default memo(ToolButton);
