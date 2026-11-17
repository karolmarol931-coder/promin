import { isOffDeviceEndpointName } from "@editor/services/documentPrivacyService";
import apiClient from "@editor/services/apiClient";
import { tauriBackendService } from "@editor/services/tauriBackendService";
import {
  createBackendNotReadyError,
  isBackendNotReadyError,
} from "@editor/constants/backendErrors";
import type { EndpointAvailabilityDetails } from "@editor/types/endpointAvailability";
import type { AppConfig } from "@editor/contexts/AppConfigContext";

export type EndpointAvailabilityMap = Record<
  string,
  EndpointAvailabilityDetails
>;

async function ensureBackendReady(): Promise<void> {
  if (!tauriBackendService.isOnline) throw createBackendNotReadyError();
  try {
    const response = await apiClient.get<AppConfig>(
      "/api/v1/config/app-config",
      { suppressErrorToast: true },
    );
    if (response.data?.dependenciesReady) return;
  } catch {
    // The backend is not ready until its config endpoint responds.
  }
  throw createBackendNotReadyError();
}

async function fetchAvailabilityMap(
  endpoints: string[],
): Promise<EndpointAvailabilityMap> {
  const query = encodeURIComponent(endpoints.join(","));
  const response = await apiClient.get<EndpointAvailabilityMap>(
    `/api/v1/config/endpoints-availability?endpoints=${query}`,
    { suppressErrorToast: true },
  );
  return response.data;
}

function normalise(
  map: EndpointAvailabilityMap,
  requested: string[],
): EndpointAvailabilityMap {
  const result: EndpointAvailabilityMap = {};
  for (const endpoint of requested) {
    const detail = map[endpoint];
    const enabled =
      !isOffDeviceEndpointName(endpoint) && (detail?.enabled ?? false);
    result[endpoint] = {
      enabled,
      reason: enabled ? null : (detail?.reason ?? "NOT_SUPPORTED_LOCALLY"),
    };
  }
  return result;
}

export async function resolveEndpointsAvailability(
  endpoints: string[],
): Promise<EndpointAvailabilityMap> {
  await ensureBackendReady();
  try {
    return normalise(await fetchAvailabilityMap(endpoints), endpoints);
  } catch (error) {
    if (isBackendNotReadyError(error)) throw error;
    return Object.fromEntries(
      endpoints.map((endpoint) => [
        endpoint,
        { enabled: false, reason: "UNKNOWN" },
      ]),
    );
  }
}

export async function resolveEndpointEnabled(
  endpoint: string,
): Promise<boolean> {
  const availability = await resolveEndpointsAvailability([endpoint]);
  return availability[endpoint]?.enabled ?? false;
}
