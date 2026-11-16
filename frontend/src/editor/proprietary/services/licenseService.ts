import apiClient from "@editor/services/apiClient";
import type { LicenseInfo } from "@editor/types/license";

export type { LicenseInfo };

const licenseService = {
  async getLicenseInfo(): Promise<LicenseInfo> {
    const response = await apiClient.get("/api/v1/admin/license-info", {
      suppressErrorToast: true,
    });
    return response.data;
  },
};

export default licenseService;
