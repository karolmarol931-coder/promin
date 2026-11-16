import React from "react";
import { AuthShell } from "@editor/auth/ui/AuthShell";
import Footer from "@editor/components/shared/Footer";

interface AuthLayoutProps {
  children: React.ReactNode;
}

/**
 * Login card shell used by the desktop app's authentication routes.
 */
export default function AuthLayout({ children }: AuthLayoutProps) {
  return <AuthShell footer={<Footer />}>{children}</AuthShell>;
}
