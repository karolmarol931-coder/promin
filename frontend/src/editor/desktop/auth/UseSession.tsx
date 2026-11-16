import type { ReactNode } from "react";
import type { TFunction } from "i18next";
import type { AuthUser } from "@editor/auth/types";
import { useAuth as useCoreAuth } from "@editor-core/auth/UseSession";

export type { AuthUser as User };

export function AuthProvider({ children }: { children: ReactNode }) {
  return children;
}

export function useAuth() {
  return useCoreAuth();
}

export function useAuthDebug() {
  return useCoreAuth();
}

export function deriveDisplayName(
  user: AuthUser | null | undefined,
  _translate: TFunction,
): string | null {
  return user?.username?.trim() || user?.email?.trim() || null;
}
