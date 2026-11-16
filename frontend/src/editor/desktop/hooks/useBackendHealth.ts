import { useCallback, useEffect, useState } from "react";
import { backendHealthMonitor } from "@editor/services/backendHealthMonitor";
import type { BackendHealthState } from "@editor/types/backendHealth";

export function useBackendHealth() {
  const [health, setHealth] = useState<BackendHealthState>(() =>
    backendHealthMonitor.getSnapshot(),
  );

  useEffect(() => backendHealthMonitor.subscribe(setHealth), []);

  const checkHealth = useCallback(() => backendHealthMonitor.checkNow(), []);

  return { ...health, isOnline: health.isOnline, checkHealth };
}
