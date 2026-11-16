import type { ReactNode } from "react";
import { SpringAuthProvider } from "@editor/auth/spring/UseSession";
import { type AuthTranslate } from "@editor/auth/types";

export interface AuthProviderProps {
  children: ReactNode;
  /** Optional i18n translate for user-facing copy (defaults to English). */
  translate?: AuthTranslate;
}

export function AuthProvider({ children, translate }: AuthProviderProps) {
  return (
    <SpringAuthProvider translate={translate}>{children}</SpringAuthProvider>
  );
}
