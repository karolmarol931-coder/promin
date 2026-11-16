import { Route, Routes } from "react-router-dom";
import { AppFrame } from "@editor/components/layout/AppFrame";
import { AppLayout } from "@editor/components/AppLayout";
import { AppRoot } from "@editor/components/layout/AppRoot";
import { AppProviders } from "@editor/components/AppProviders";
import { DesktopOnboardingModal } from "@editor/components/DesktopOnboardingModal";
import "@editor/styles/tailwind.css";

export default function App() {
  return (
    <Routes>
      <Route element={<AppFrame />}>
        <Route
          path="*"
          element={
            <AppProviders>
              <AppLayout>
                <AppRoot />
                <DesktopOnboardingModal />
              </AppLayout>
            </AppProviders>
          }
        />
      </Route>
    </Routes>
  );
}
