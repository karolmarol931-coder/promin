import apiClient from "@editor/services/apiClient";
import type {
  ConnectionsSettingsData,
  LegalSettingsData,
  PrivacySettingsData,
  SecuritySettingsData,
} from "@editor/components/shared/config/configSections/security/securitySettingsTypes";

// The fetch/save transformers for the merged page's four sub-fetches, kept out
// of the page file so it reads as hooks, one draft, one save.

interface SettingsSaveResult {
  sectionData: Record<string, unknown>;
  deltaSettings: Record<string, unknown>;
}

export async function fetchSecuritySettings(): Promise<
  SecuritySettingsData & { _pending?: Record<string, unknown> }
> {
  const [securityResponse, premiumResponse, systemResponse] = await Promise.all(
    [
      apiClient.get("/api/v1/admin/settings/section/security"),
      apiClient.get("/api/v1/admin/settings/section/premium"),
      apiClient.get("/api/v1/admin/settings/section/system"),
    ],
  );

  const securityData = securityResponse.data || {};
  const premiumData = premiumResponse.data || {};
  const systemData = systemResponse.data || {};

  const { _pending: securityPending, ...securityActive } = securityData;
  const { _pending: premiumPending, ...premiumActive } = premiumData;
  const { _pending: systemPending, ...systemActive } = systemData;

  const combined: SecuritySettingsData & {
    _pending?: Record<string, unknown>;
  } = {
    ...securityActive,
  };

  // Only add audit if it exists (don't create defaults)
  if (premiumActive.enterpriseFeatures?.audit) {
    combined.audit = premiumActive.enterpriseFeatures.audit;
  }

  // Only add html if it exists (don't create defaults)
  if (systemActive.html) {
    combined.html = systemActive.html;
  }

  // Merge all _pending blocks
  const mergedPending: Record<string, unknown> = {};
  if (securityPending) {
    Object.assign(mergedPending, securityPending);
  }
  if (premiumPending?.enterpriseFeatures?.audit) {
    mergedPending.audit = premiumPending.enterpriseFeatures.audit;
  }
  if (systemPending?.html) {
    mergedPending.html = systemPending.html;
  }

  if (Object.keys(mergedPending).length > 0) {
    combined._pending = mergedPending;
  }

  return combined;
}

export function saveSecuritySettings(
  settings: SecuritySettingsData,
): SettingsSaveResult {
  const { audit, html, ...securitySettings } = settings;

  const deltaSettings: Record<string, unknown> = {
    "security.enableLogin": securitySettings.enableLogin,
    "security.honorOwnerPasswords": securitySettings.honorOwnerPasswords,
    "security.loginMethod": securitySettings.loginMethod,
    "security.loginAttemptCount": securitySettings.loginAttemptCount,
    "security.loginResetTimeMinutes": securitySettings.loginResetTimeMinutes,
    "security.xFrameOptions": securitySettings.xFrameOptions,
    "security.jwt.enableKeyCleanup": securitySettings.jwt?.enableKeyCleanup,
    "security.jwt.tokenExpiryMinutes": securitySettings.jwt?.tokenExpiryMinutes,
    "security.jwt.desktopTokenExpiryMinutes":
      securitySettings.jwt?.desktopTokenExpiryMinutes,
    "security.jwt.allowedClockSkewSeconds":
      securitySettings.jwt?.allowedClockSkewSeconds,
    "security.jwt.refreshGraceMinutes":
      securitySettings.jwt?.refreshGraceMinutes,
    "security.jwt.secureCookie": securitySettings.jwt?.secureCookie,
    // Premium audit settings
    "premium.enterpriseFeatures.audit.enabled": audit?.enabled,
    "premium.enterpriseFeatures.audit.level": audit?.level,
    "premium.enterpriseFeatures.audit.retentionDays": audit?.retentionDays,
    "premium.enterpriseFeatures.audit.captureFileHash": audit?.captureFileHash,
    "premium.enterpriseFeatures.audit.capturePdfAuthor":
      audit?.capturePdfAuthor,
    "premium.enterpriseFeatures.audit.captureOperationResults":
      audit?.captureOperationResults,
  };

  // System HTML settings
  if (html?.urlSecurity) {
    deltaSettings["system.html.urlSecurity.enabled"] = html.urlSecurity.enabled;
    deltaSettings["system.html.urlSecurity.level"] = html.urlSecurity.level;
    deltaSettings["system.html.urlSecurity.allowedDomains"] =
      html.urlSecurity.allowedDomains;
    deltaSettings["system.html.urlSecurity.blockedDomains"] =
      html.urlSecurity.blockedDomains;
    deltaSettings["system.html.urlSecurity.internalTlds"] =
      html.urlSecurity.internalTlds;
    deltaSettings["system.html.urlSecurity.blockPrivateNetworks"] =
      html.urlSecurity.blockPrivateNetworks;
    deltaSettings["system.html.urlSecurity.blockLocalhost"] =
      html.urlSecurity.blockLocalhost;
    deltaSettings["system.html.urlSecurity.blockLinkLocal"] =
      html.urlSecurity.blockLinkLocal;
    deltaSettings["system.html.urlSecurity.blockCloudMetadata"] =
      html.urlSecurity.blockCloudMetadata;
  }

  return {
    sectionData: {},
    deltaSettings,
  };
}

export async function fetchConnectionsSettings(): Promise<
  ConnectionsSettingsData & { _pending?: Record<string, unknown> }
> {
  // Fetch security settings (oauth2, saml2)
  const securityResponse = await apiClient.get(
    "/api/v1/admin/settings/section/security",
  );
  const securityData = securityResponse.data || {};

  // Fetch mail settings
  const mailResponse = await apiClient.get(
    "/api/v1/admin/settings/section/mail",
  );
  const mailData = mailResponse.data || {};

  // Fetch Telegram settings
  const telegramResponse = await apiClient.get(
    "/api/v1/admin/settings/section/telegram",
  );
  const telegramData = telegramResponse.data || {};

  const result: ConnectionsSettingsData & {
    _pending?: Record<string, unknown>;
  } = {
    oauth2: securityData.oauth2 || {},
    saml2: securityData.saml2 || {},
    mail: mailData || {},
    telegram: telegramData || {},
    ssoAutoLogin: securityData.ssoAutoLogin || false,
  };

  // Merge pending blocks from all endpoints
  const pendingBlock: Record<string, unknown> = {};
  if (securityData._pending?.oauth2) {
    pendingBlock.oauth2 = securityData._pending.oauth2;
  }
  if (securityData._pending?.saml2) {
    pendingBlock.saml2 = securityData._pending.saml2;
  }
  if (mailData._pending) {
    pendingBlock.mail = mailData._pending;
  }
  if (telegramData._pending) {
    pendingBlock.telegram = telegramData._pending;
  }
  if (securityData._pending?.ssoAutoLogin !== undefined) {
    pendingBlock.ssoAutoLogin = securityData._pending.ssoAutoLogin;
  }
  if (Object.keys(pendingBlock).length > 0) {
    result._pending = pendingBlock;
  }

  return result;
}

export function saveConnectionsSettings(
  currentSettings: ConnectionsSettingsData,
): SettingsSaveResult {
  const deltaSettings: Record<string, unknown> = {};

  // Build delta for oauth2 settings
  if (currentSettings.oauth2) {
    Object.keys(currentSettings.oauth2).forEach((key) => {
      if (key !== "client") {
        deltaSettings[`security.oauth2.${key}`] = (
          currentSettings.oauth2 as Record<string, unknown>
        )[key];
      }
    });

    // Build delta for specific OAuth2 providers
    const oauth2Client = currentSettings.oauth2.client;
    if (oauth2Client) {
      Object.keys(oauth2Client).forEach((providerId) => {
        const providerSettings = oauth2Client[providerId] as Record<
          string,
          unknown
        >;
        Object.keys(providerSettings).forEach((key) => {
          deltaSettings[`security.oauth2.client.${providerId}.${key}`] =
            providerSettings[key];
        });
      });
    }
  }

  // Build delta for saml2 settings
  if (currentSettings.saml2) {
    const saml2 = currentSettings.saml2 as Record<string, unknown>;
    Object.keys(saml2).forEach((key) => {
      deltaSettings[`security.saml2.${key}`] = saml2[key];
    });
  }

  if (currentSettings.mail) {
    const mail = currentSettings.mail as Record<string, unknown>;
    Object.keys(mail).forEach((key) => {
      deltaSettings[`mail.${key}`] = mail[key];
    });
  }

  if (currentSettings.telegram) {
    const telegram = currentSettings.telegram as Record<string, unknown>;
    Object.keys(telegram).forEach((key) => {
      deltaSettings[`telegram.${key}`] = telegram[key];
    });
  }

  if (currentSettings?.ssoAutoLogin !== undefined) {
    deltaSettings["security.ssoAutoLogin"] = currentSettings.ssoAutoLogin;
  }

  return {
    sectionData: {},
    deltaSettings,
  };
}

export async function fetchPrivacySettings(): Promise<
  PrivacySettingsData & { _pending?: Record<string, unknown> }
> {
  const [metricsResponse, systemResponse] = await Promise.all([
    apiClient.get("/api/v1/admin/settings/section/metrics"),
    apiClient.get("/api/v1/admin/settings/section/system"),
  ]);

  const metrics = metricsResponse.data;
  const system = systemResponse.data;

  const result: PrivacySettingsData & {
    _pending?: Record<string, unknown>;
  } = {
    googleVisibility: system.googlevisibility || false,
    metricsEnabled: metrics.enabled || false,
  };

  // Merge pending blocks from both endpoints
  const pendingBlock: Record<string, unknown> = {};
  if (system._pending?.googlevisibility !== undefined) {
    pendingBlock.googleVisibility = system._pending.googlevisibility;
  }
  if (metrics._pending?.enabled !== undefined) {
    pendingBlock.metricsEnabled = metrics._pending.enabled;
  }

  if (Object.keys(pendingBlock).length > 0) {
    result._pending = pendingBlock;
  }

  return result;
}

export function savePrivacySettings(
  settings: PrivacySettingsData,
): SettingsSaveResult {
  const deltaSettings = {
    "system.googlevisibility": settings.googleVisibility,
    "metrics.enabled": settings.metricsEnabled,
  };

  return {
    sectionData: {},
    deltaSettings,
  };
}

// loginAgreement goes through the flat endpoint: a partial nested object sent
// to the section endpoint replaces the node and drops fallbackText, unedited.
export function saveLegalSettings(
  current: LegalSettingsData,
): SettingsSaveResult {
  const { loginAgreement, ...flat } = current;
  const deltaSettings: Record<string, unknown> = {};
  if (loginAgreement) {
    deltaSettings["legal.loginAgreement.enabled"] =
      loginAgreement.enabled ?? false;
    deltaSettings["legal.loginAgreement.showInAnonymousMode"] =
      loginAgreement.showInAnonymousMode ?? true;
  }
  return { sectionData: flat, deltaSettings };
}
