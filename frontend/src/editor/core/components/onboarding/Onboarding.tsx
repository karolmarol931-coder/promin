import { useEffect, useMemo, useCallback, useState } from "react";
import { type StepType } from "@reactour/tour";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import { isAuthRoute } from "@editor/constants/routes";
import { useOnboardingOrchestrator } from "@editor/components/onboarding/orchestrator/useOnboardingOrchestrator";
import { useBypassOnboarding } from "@editor/components/onboarding/useBypassOnboarding";
import OnboardingTour, {
  type AdvanceArgs,
  type CloseArgs,
} from "@editor/components/onboarding/OnboardingTour";
import OnboardingModalSlide from "@editor/components/onboarding/OnboardingModalSlide";
import { useTourRequest } from "@editor/components/onboarding/useOnboardingEffects";
import {
  SLIDE_DEFINITIONS,
  type ButtonAction,
} from "@editor/components/onboarding/onboardingFlowConfig";
import ToolPanelModePrompt from "@editor/components/tools/ToolPanelModePrompt";
import { useTourOrchestration } from "@editor/contexts/TourOrchestrationContext";
import { useAdminTourOrchestration } from "@editor/contexts/AdminTourOrchestrationContext";
import { getTourSteps } from "@editor/components/onboarding/tourRegistry";
import { useFilesModalContext } from "@editor/contexts/FilesModalContext";
import { useServerExperience } from "@editor/hooks/useServerExperience";
import "@editor/components/onboarding/OnboardingTour.css";

export default function Onboarding() {
  const { t } = useTranslation();
  const location = useLocation();
  const bypassOnboarding = useBypassOnboarding();
  const { state, actions } = useOnboardingOrchestrator();
  const serverExperience = useServerExperience();
  const onAuthRoute = isAuthRoute(location.pathname);
  const { currentStep, isActive, isLoading, runtimeState, activeFlow } = state;

  const {
    tourRequested: externalTourRequested,
    requestedTourType,
    clearTourRequest,
  } = useTourRequest();
  const handleRoleSelect = useCallback(
    (role: "admin" | "user" | null) => {
      actions.updateRuntimeState({ selectedRole: role });
      serverExperience.setSelfReportedAdmin(role === "admin");
    },
    [actions, serverExperience],
  );

  const handleButtonAction = useCallback(
    async (action: ButtonAction) => {
      switch (action) {
        case "next":
        case "complete-close":
          actions.complete();
          break;
        case "prev":
          actions.prev();
          break;
        case "close":
          actions.skip();
          break;
        case "security-next":
          if (!runtimeState.selectedRole) return;
          if (runtimeState.selectedRole !== "admin") {
            actions.updateRuntimeState({ tourType: "whatsnew" });
            setIsTourOpen(true);
          }
          actions.complete();
          break;
        case "launch-tools":
          actions.updateRuntimeState({ tourType: "whatsnew" });
          setIsTourOpen(true);
          break;
        case "launch-auto": {
          const tourType =
            serverExperience.effectiveIsAdmin ||
            runtimeState.selectedRole === "admin"
              ? "admin"
              : "whatsnew";
          actions.updateRuntimeState({ tourType });
          setIsTourOpen(true);
          break;
        }
        case "skip-tour":
          actions.complete();
          break;
      }
    },
    [actions, runtimeState.selectedRole, serverExperience.effectiveIsAdmin],
  );

  const isRTL =
    typeof document !== "undefined"
      ? document.documentElement.dir === "rtl"
      : false;
  const [isTourOpen, setIsTourOpen] = useState(false);

  const { openFilesModal, closeFilesModal } = useFilesModalContext();
  const tourOrch = useTourOrchestration();
  const adminTourOrch = useAdminTourOrchestration();

  const tourSteps = useMemo<StepType[]>(
    () =>
      getTourSteps(runtimeState.tourType, {
        t,
        workbench: tourOrch,
        admin: adminTourOrch,
        openFilesModal,
        closeFilesModal,
      }),
    [
      runtimeState.tourType,
      t,
      tourOrch,
      adminTourOrch,
      openFilesModal,
      closeFilesModal,
    ],
  );

  useEffect(() => {
    if (externalTourRequested) {
      actions.updateRuntimeState({ tourType: requestedTourType });
      setIsTourOpen(true);
      clearTourRequest();
    }
  }, [externalTourRequested, requestedTourType, actions, clearTourRequest]);

  const finishTour = useCallback(() => {
    setIsTourOpen(false);
    if (runtimeState.tourType === "admin") {
      adminTourOrch.restoreAdminState();
    } else {
      tourOrch.restoreWorkbenchState();
    }
    // Advance to next onboarding step after tour completes
    actions.complete();
  }, [actions, adminTourOrch, runtimeState.tourType, tourOrch]);

  const handleAdvanceTour = useCallback(
    (args: AdvanceArgs) => {
      const {
        setCurrentStep,
        currentStep: tourCurrentStep,
        steps,
        setIsOpen,
      } = args;
      if (steps && tourCurrentStep === steps.length - 1) {
        setIsOpen(false);
        finishTour();
      } else if (steps) {
        setCurrentStep((s) => (s === steps.length - 1 ? 0 : s + 1));
      }
    },
    [finishTour],
  );

  const handleCloseTour = useCallback(
    (args: CloseArgs) => {
      args.setIsOpen(false);
      finishTour();
    },
    [finishTour],
  );

  const currentSlideDefinition = useMemo(() => {
    if (
      !currentStep ||
      currentStep.type !== "modal-slide" ||
      !currentStep.slideId
    ) {
      return null;
    }
    return SLIDE_DEFINITIONS[currentStep.slideId];
  }, [currentStep]);

  const currentSlideContent = useMemo(() => {
    if (!currentSlideDefinition) return null;
    return currentSlideDefinition.createSlide({
      selectedRole: runtimeState.selectedRole,
      onRoleSelect: handleRoleSelect,
      firstLoginUsername: runtimeState.firstLoginUsername,
      usingDefaultCredentials: runtimeState.usingDefaultCredentials,
    });
  }, [
    currentSlideDefinition,
    runtimeState.selectedRole,
    handleRoleSelect,
    runtimeState.firstLoginUsername,
  ]);

  const modalSlideCount = useMemo(() => {
    return activeFlow.filter((step) => step.type === "modal-slide").length;
  }, [activeFlow]);

  const currentModalSlideIndex = useMemo(() => {
    if (!currentStep || currentStep.type !== "modal-slide") return 0;
    const modalSlides = activeFlow.filter(
      (step) => step.type === "modal-slide",
    );
    return modalSlides.findIndex((step) => step.id === currentStep.id);
  }, [activeFlow, currentStep]);

  if (bypassOnboarding) {
    return null;
  }

  if (onAuthRoute) {
    return null;
  }

  // Always render the tour component (it controls its own visibility with isOpen)
  const tourComponent = (
    <OnboardingTour
      isOpen={isTourOpen}
      tourSteps={tourSteps}
      tourType={runtimeState.tourType}
      isRTL={isRTL}
      t={t}
      onAdvance={handleAdvanceTour}
      onClose={handleCloseTour}
    />
  );

  // If no active onboarding, just show the tour (which may or may not be open)
  if (isLoading || !isActive || !currentStep) {
    return tourComponent;
  }

  // If tour is open, hide the onboarding modal and just show the tour
  if (isTourOpen) {
    return tourComponent;
  }

  // Render the current onboarding step
  switch (currentStep.type) {
    case "tool-prompt":
      return (
        <ToolPanelModePrompt forceOpen={true} onComplete={actions.complete} />
      );

    case "modal-slide":
      if (!currentSlideDefinition || !currentSlideContent) return null;
      return (
        <OnboardingModalSlide
          slideDefinition={currentSlideDefinition}
          slideContent={currentSlideContent}
          runtimeState={runtimeState}
          modalSlideCount={modalSlideCount}
          currentModalSlideIndex={currentModalSlideIndex}
          onSkip={actions.skip}
          onAction={handleButtonAction}
          allowDismiss={currentStep.allowDismiss}
        />
      );

    default:
      return null;
  }
}
