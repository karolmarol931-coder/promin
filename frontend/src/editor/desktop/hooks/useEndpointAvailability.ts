import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { tauriBackendService } from "@editor/services/tauriBackendService";
import { isBackendNotReadyError } from "@editor/constants/backendErrors";
import { useLocalProcessingOnly } from "@editor/hooks/useLocalProcessingOnly";
import { isOffDeviceEndpointName } from "@editor/services/documentPrivacyService";
import { qk } from "@editor/query/keys";
import { CONFIG_STALE_TIME } from "@editor/query/staleTime";
import {
  resolveEndpointEnabled,
  resolveEndpointsAvailability,
} from "@editor/api/endpointAvailability";
import type { EndpointAvailabilityDetails } from "@editor/types/endpointAvailability";

const RETRY_DELAY_MS = 2500;
const OPTIMISTIC: EndpointAvailabilityDetails = { enabled: true, reason: null };

const subscribeReadiness = (onChange: () => void) =>
  tauriBackendService.subscribeToStatus(onChange);
const getBackendOnline = () => tauriBackendService.isOnline;

function useBackendReadiness() {
  const backendOnline = useSyncExternalStore(
    subscribeReadiness,
    getBackendOnline,
  );
  return { ready: backendOnline, backendOnline };
}

const retryWhileStarting = (_count: number, error: unknown) =>
  isBackendNotReadyError(error);

export function useEndpointEnabled(endpoint: string): {
  enabled: boolean | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
} {
  const queryClient = useQueryClient();
  const localOnly = useLocalProcessingOnly();
  const { ready, backendOnline } = useBackendReadiness();
  const queryKey = [...qk.endpointEnabled(endpoint), localOnly];

  const { data, refetch } = useQuery({
    queryKey,
    queryFn: () => resolveEndpointEnabled(endpoint),
    enabled: Boolean(endpoint) && ready,
    staleTime: CONFIG_STALE_TIME,
    retry: retryWhileStarting,
    retryDelay: RETRY_DELAY_MS,
  });

  const seenReadiness = useRef<string | null>(null);
  const readinessMark = `${backendOnline}:${endpoint}`;
  useEffect(() => {
    const first = seenReadiness.current === null;
    seenReadiness.current = readinessMark;
    if (first || !ready) return;
    void queryClient.invalidateQueries({ queryKey });
  }, [readinessMark]);

  return {
    enabled: endpoint
      ? (data ?? (!localOnly || !isOffDeviceEndpointName(endpoint)))
      : null,
    loading: false,
    error: null,
    refetch: useCallback(async () => {
      await refetch();
    }, [refetch]),
  };
}

export function useMultipleEndpointsEnabled(endpoints: string[]): {
  endpointStatus: Record<string, boolean>;
  endpointDetails: Record<string, EndpointAvailabilityDetails>;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
} {
  const queryClient = useQueryClient();
  const localOnly = useLocalProcessingOnly();
  const { ready, backendOnline } = useBackendReadiness();
  const wanted = endpoints ?? [];
  const key = wanted.join(",");
  const queryKey = [...qk.endpointsAvailability(), key, localOnly];

  const { data, isPending, refetch } = useQuery({
    queryKey,
    queryFn: () => resolveEndpointsAvailability(key ? key.split(",") : []),
    enabled: wanted.length > 0 && ready,
    staleTime: CONFIG_STALE_TIME,
    retry: retryWhileStarting,
    retryDelay: RETRY_DELAY_MS,
  });

  const seenReadiness = useRef<string | null>(null);
  const readinessMark = `${backendOnline}`;
  useEffect(() => {
    const first = seenReadiness.current === null;
    seenReadiness.current = readinessMark;
    if (first || !ready) return;
    void queryClient.invalidateQueries({
      queryKey: qk.endpointsAvailability(),
    });
  }, [readinessMark]);

  const projected = useMemo(() => {
    const status: Record<string, boolean> = {};
    const details: Record<string, EndpointAvailabilityDetails> = {};
    if (!data && !localOnly) return { status, details };
    for (const endpoint of key ? key.split(",") : []) {
      const detail =
        data?.[endpoint] ??
        (isOffDeviceEndpointName(endpoint)
          ? { enabled: false, reason: "NOT_SUPPORTED_LOCALLY" as const }
          : OPTIMISTIC);
      status[endpoint] = detail.enabled;
      details[endpoint] = detail;
    }
    return { status, details };
  }, [data, key, localOnly]);

  return {
    endpointStatus: projected.status,
    endpointDetails: projected.details,
    loading: wanted.length > 0 && isPending,
    error: null,
    refetch: useCallback(async () => {
      await refetch();
    }, [refetch]),
  };
}
