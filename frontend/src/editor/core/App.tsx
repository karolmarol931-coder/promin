import { Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import { AppProviders } from "@editor/components/AppProviders";
import { AppFrame } from "@editor/components/layout/AppFrame";
import { AppLayout } from "@editor/components/AppLayout";
import { LoadingFallback } from "@editor/components/shared/LoadingFallback";
import { AppRoot } from "@editor/components/layout/AppRoot";
import Onboarding from "@editor/components/onboarding/Onboarding";

// Import global styles
import "@editor/styles/tailwind.css";
import "@editor/styles/index.css";

// Import file ID debugging helpers (development only)
import "@editor/utils/fileIdSafety";

export default function App() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        {/* The app, under a shared frame so the rail renders once outside it. */}
        <Route element={<AppFrame />}>
          {/* All other routes need AppProviders for backend integration */}
          <Route
            path="*"
            element={
              <AppProviders>
                <AppLayout>
                  <AppRoot />
                  <Onboarding />
                </AppLayout>
              </AppProviders>
            }
          />
        </Route>
      </Routes>
    </Suspense>
  );
}
