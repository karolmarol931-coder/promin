import type { ReactNode } from "react";

/** Redirects stale web routes to the local app root. */
export function RootGate({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export default RootGate;
