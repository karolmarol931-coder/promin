import {
  documentPrivacyError,
  isOffDeviceEndpointName,
  requiresOffDeviceProcessing,
} from "@editor/services/documentPrivacyService";
import { endpointAvailabilityService } from "@editor/services/endpointAvailabilityService";
import { tauriBackendService } from "@editor/services/tauriBackendService";
import {
  CONVERSION_ENDPOINTS,
  ENDPOINT_NAMES,
} from "@editor/constants/convertConstants";

export class OperationRouter {
  private static instance: OperationRouter;

  static getInstance(): OperationRouter {
    if (!OperationRouter.instance) {
      OperationRouter.instance = new OperationRouter();
    }
    return OperationRouter.instance;
  }

  private isToolEndpoint(endpoint: string): boolean {
    return /^\/api\/v1\/(?:general|convert|misc|security|filter|multi-tool|ui-data)\//.test(
      endpoint,
    );
  }

  private extractEndpointName(endpoint: string): string {
    const uiDataMatch = endpoint.match(/^\/api\/v1\/ui-data\/(.+)$/);
    if (uiDataMatch) return uiDataMatch[1];

    if (endpoint.startsWith("/api/v1/convert/")) {
      for (const [key, path] of Object.entries(CONVERSION_ENDPOINTS)) {
        if (path === endpoint) {
          return ENDPOINT_NAMES[key as keyof typeof ENDPOINT_NAMES];
        }
      }

      const convertMatch = endpoint.match(
        /^\/api\/v1\/convert\/([^/]+)\/([^/]+)$/,
      );
      if (convertMatch) return `${convertMatch[1]}-to-${convertMatch[2]}`;
    }

    const toolMatch = endpoint.match(
      /^\/api\/v1\/(?:general|misc|security|filter|multi-tool)\/(.+)$/,
    );
    return toolMatch?.[1] ?? endpoint;
  }

  async getBaseUrl(operation?: string, endpointName?: string): Promise<string> {
    const backendUrl = tauriBackendService.getBackendUrl();
    if (!backendUrl) {
      throw new Error("Local backend is still starting");
    }

    if (operation && /^(?:https?:)?\/\//i.test(operation)) {
      const target = new URL(operation, backendUrl);
      const backend = new URL(backendUrl);
      if (target.origin !== backend.origin) throw documentPrivacyError();
      operation = `${target.pathname}${target.search}`;
    }

    if (
      operation &&
      (requiresOffDeviceProcessing(operation) ||
        (endpointName && isOffDeviceEndpointName(endpointName)))
    ) {
      throw documentPrivacyError();
    }

    if (operation && this.isToolEndpoint(operation)) {
      const capability = endpointName ?? this.extractEndpointName(operation);
      const supported =
        await endpointAvailabilityService.isEndpointSupportedLocally(
          capability,
          backendUrl,
        );
      if (!supported) throw documentPrivacyError();
    }

    return backendUrl.replace(/\/$/, "");
  }
}

export const operationRouter = OperationRouter.getInstance();
