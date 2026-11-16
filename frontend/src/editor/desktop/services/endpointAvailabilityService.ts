import { fetch } from "@tauri-apps/plugin-http";

const CACHE_DURATION_MS = 5 * 60 * 1000;

export class EndpointAvailabilityService {
  private cache = new Map<string, { available: boolean; expiresAt: number }>();

  async isEndpointSupportedLocally(
    endpoint: string,
    backendUrl: string | null,
  ): Promise<boolean> {
    const cached = this.cache.get(endpoint);
    if (cached && Date.now() < cached.expiresAt) return cached.available;
    if (!backendUrl) return false;

    try {
      const url = `${backendUrl}/api/v1/config/endpoints-availability?endpoints=${encodeURIComponent(endpoint)}`;
      const response = await fetch(url, {
        method: "GET",
        headers: { "Cache-Control": "no-store" },
      });
      if (!response.ok) return false;

      const data = (await response.json()) as Record<
        string,
        { enabled?: boolean } | undefined
      >;
      const available = data[endpoint]?.enabled ?? false;
      this.cache.set(endpoint, {
        available,
        expiresAt: Date.now() + CACHE_DURATION_MS,
      });
      return available;
    } catch (error) {
      console.error(
        "[endpointAvailabilityService] Local capability check failed:",
        error,
      );
      return false;
    }
  }

  clearCache(): void {
    this.cache.clear();
  }

  debugCache(): void {
    console.table(
      Array.from(this.cache, ([endpoint, value]) => ({
        endpoint,
        available: value.available,
        expiresInMs: Math.max(0, value.expiresAt - Date.now()),
      })),
    );
  }

  async preloadEndpoints(
    endpoints: string[],
    backendUrl: string | null,
  ): Promise<void> {
    if (!backendUrl || endpoints.length === 0) return;

    try {
      const url = `${backendUrl}/api/v1/config/endpoints-availability?endpoints=${encodeURIComponent(endpoints.join(","))}`;
      const response = await fetch(url, {
        method: "GET",
        headers: { "Cache-Control": "no-store" },
      });
      if (!response.ok) return;

      const data = (await response.json()) as Record<
        string,
        { enabled?: boolean } | undefined
      >;
      const expiresAt = Date.now() + CACHE_DURATION_MS;
      for (const [endpoint, details] of Object.entries(data)) {
        this.cache.set(endpoint, {
          available: details?.enabled ?? false,
          expiresAt,
        });
      }
    } catch (error) {
      console.error(
        "[endpointAvailabilityService] Local capability preload failed:",
        error,
      );
    }
  }
}

export const endpointAvailabilityService = new EndpointAvailabilityService();

if (typeof window !== "undefined") {
  window.endpointAvailabilityService = endpointAvailabilityService;
}
