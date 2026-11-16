export type OnboardingStepId =
  | "first-login"
  | "welcome"
  | "security-check"
  | "tool-layout"
  | "tour-overview"
  | "mfa-setup";

export type OnboardingStepType = "modal-slide" | "tool-prompt";

export interface OnboardingRuntimeState {
  selectedRole: "admin" | "user" | null;
  tourRequested: boolean;
  // Open key into the tour registry (see tourRegistry.ts).
  tourType: string;
  isDesktopApp: boolean;
  requiresPasswordChange: boolean;
  firstLoginUsername: string;
  usingDefaultCredentials: boolean;
  requiresMfaSetup: boolean;
}

export interface OnboardingConditionContext extends OnboardingRuntimeState {
  loginEnabled: boolean;
  effectiveIsAdmin: boolean;
}

export interface OnboardingStep {
  id: OnboardingStepId;
  type: OnboardingStepType;
  condition: (ctx: OnboardingConditionContext) => boolean;
  slideId?:
    | "first-login"
    | "welcome"
    | "security-check"
    | "tour-overview"
    | "mfa-setup";
  allowDismiss?: boolean;
}

export const DEFAULT_RUNTIME_STATE: OnboardingRuntimeState = {
  selectedRole: null,
  tourRequested: false,
  tourType: "whatsnew",
  isDesktopApp: false,
  requiresPasswordChange: false,
  firstLoginUsername: "",
  usingDefaultCredentials: false,
  requiresMfaSetup: false,
};

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: "welcome",
    type: "modal-slide",
    slideId: "welcome",
    // Desktop has its own onboarding modal (DesktopOnboardingModal)
    condition: (ctx) => !ctx.isDesktopApp,
  },
  {
    id: "tour-overview",
    type: "modal-slide",
    slideId: "tour-overview",
    condition: (ctx) =>
      !ctx.effectiveIsAdmin && ctx.tourType !== "admin" && !ctx.isDesktopApp,
  },
];

export function getStepById(id: OnboardingStepId): OnboardingStep | undefined {
  return ONBOARDING_STEPS.find((step) => step.id === id);
}

export function getStepIndex(id: OnboardingStepId): number {
  return ONBOARDING_STEPS.findIndex((step) => step.id === id);
}
