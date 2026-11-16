export interface LicenseInfo {
  licenseType: "NORMAL" | "SERVER" | "ENTERPRISE";
  enabled: boolean;
  maxUsers: number;
  maxAllowedUsers?: number;
  hasKey: boolean;
  licenseKey?: string;
}
