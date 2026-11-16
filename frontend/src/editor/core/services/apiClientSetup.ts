import type { AxiosInstance } from "axios";

export function setupApiInterceptors(_client: AxiosInstance): void {}

/** Auth headers for raw fetch() calls; empty in core and supplied by auth-enabled builds. */
export async function getAuthHeaders(): Promise<Record<string, string>> {
  return {};
}
