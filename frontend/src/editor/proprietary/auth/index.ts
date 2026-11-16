/**
 * Shared authentication for the editor and local backend.
 *
 * Hosts configure Spring authentication once at startup, then render
 * <AuthProvider>.
 *
 * Consumers read state via useAuth(); guards (RequireAuth/RequireAdmin) gate UI.
 */

// Contract + helpers
export * from "@editor/auth/types";
export { isAdminRole } from "@editor/auth/roles";
export { AuthContext, useAuth } from "@editor/auth/context";

// Unified provider + guards
export {
  AuthProvider,
  type AuthProviderProps,
} from "@editor/auth/AuthProvider";
export {
  RequireAuth,
  type RequireAuthProps,
} from "@editor/auth/guards/RequireAuth";
export {
  RequireAdmin,
  type RequireAdminProps,
} from "@editor/auth/guards/RequireAdmin";
// Spring backend
export {
  configureSpringAuth,
  getSpringAuthConfig,
  type SpringAuthConfig,
} from "@editor/auth/config";
export {
  type PlatformBridge,
  type PlatformSessionUser,
  defaultPlatformBridge,
} from "@editor/auth/spring/platformBridge";
export {
  createDefaultHttpClient,
  getStoredToken,
  setStoredToken,
  clearStoredToken,
  JWT_STORAGE_KEY,
} from "@editor/auth/httpClient";
export {
  SpringAuthProvider,
  deriveDisplayName,
} from "@editor/auth/spring/UseSession";
export {
  springAuth,
  setPostLoginRedirectPath,
  consumePostLoginRedirectPath,
  isSafePostLoginRedirect,
  POST_LOGIN_REDIRECT_STORAGE_KEY,
  getCurrentUser,
  isUserAnonymous,
  createAnonymousUser,
  createAnonymousSession,
} from "@editor/auth/spring/springAuthClient";
export type { OAuthProvider } from "@editor/auth/spring/oauthTypes";

// Login UI components live under @editor/auth/ui/* and are imported directly
// (default exports), e.g. `import OAuthButtons from "@editor/auth/ui/OAuthButtons"`.
// They use react-i18next, so hosts must initialise i18next.
