export interface AppConfig {
  baseUrl?: string;
  contextPath?: string;
  serverPort?: number;
  appNameNavbar?: string;
  languages?: string[];
  defaultLocale?: string;
  enableLogin?: boolean;
  honorOwnerPasswords?: boolean;
  showSettingsWhenNoLogin?: boolean;
  enableEmailInvites?: boolean;
  enableOAuth?: boolean;
  enableSaml?: boolean;
  isAdmin?: boolean;
  shouldShowUpdate?: boolean;
  enableAlphaFunctionality?: boolean;
  stirlingOfficeConversion?: boolean;
  /** False strips the hidden novelty features - see useSecretClicks. */
  enableEasterEggs?: boolean;
  premiumEnabled?: boolean;
  premiumKey?: string;
  termsAndConditions?: string;
  privacyPolicy?: string;
  cookiePolicy?: string;
  impressum?: string;
  accessibilityStatement?: string;
  runningProOrHigher?: boolean;
  runningEE?: boolean;
  license?: string;
  SSOAutoLogin?: boolean;
  serverCertificateEnabled?: boolean;
  hardwareSigningAvailable?: boolean;
  appVersion?: string;
  machineType?: string;
  activeSecurity?: boolean;
  dependenciesReady?: boolean;
  error?: string;
  isNewServer?: boolean;
  isNewUser?: boolean;
  /** Server tool-panel default; a stored user preference takes precedence. */
  defaultToolPanelMode?: "sidebar" | "fullscreen";
  /** Server startup-view default; a stored user preference takes precedence. */
  defaultStartupView?: "tools" | "read" | "automate";
  defaultHideUnavailableTools?: boolean;
  defaultHideUnavailableConversions?: boolean;
  storageEnabled?: boolean;
  storageSharingEnabled?: boolean;
  storageShareLinksEnabled?: boolean;
  storageShareEmailEnabled?: boolean;
  storageGroupSigningEnabled?: boolean;
  timestampDefaultTsaUrl?: string;
  timestampCustomTsaUrls?: string[];
  timestampTsaPresets?: { label: string; url: string }[];
  aiEngineEnabled?: boolean;
  aiFeatures?: {
    chat?: boolean;
    documentQuestions?: boolean;
    createPdf?: boolean;
    mathAuditor?: boolean;
    pdfComment?: boolean;
    classify?: boolean;
  };
}

export type AppConfigBootstrapMode = "blocking" | "non-blocking";
