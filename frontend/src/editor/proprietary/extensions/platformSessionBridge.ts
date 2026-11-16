/**
 * Resolved identity for the current session, as understood by the platform
 * layer (desktop) that owns the underlying token format. The proprietary
 * auth client treats these fields as opaque - it does NOT inspect the JWT
 * directly. Each platform decides how to populate this from whatever
 * token/user storage it owns (e.g. desktop reads the Tauri user_info store
 * plus the Supabase JWT claims; web has no platform layer).
 */
export interface PlatformSessionUser {
  username: string;
  email?: string;
  /** True for anonymous/guest sessions (e.g. Supabase anonymous sign-in). */
  is_anonymous?: boolean;
}

/**
 * Whether the currently-authoritative backend exposes `/api/v1/auth/logout`
 * and should be hit during sign-out.
 */
export async function shouldCallBackendLogout(): Promise<boolean> {
  return true;
}

/**
 * Proprietary/web default: no platform-specific token storage (uses localStorage only).
 */
export async function savePlatformToken(_token: string): Promise<void> {
  // Web mode: token already saved to localStorage in springAuthClient
  // No additional platform storage needed
}
