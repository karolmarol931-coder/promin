import WelcomeSlide from "@editor/components/onboarding/slides/WelcomeSlide";
import SecurityCheckSlide from "@editor/components/onboarding/slides/SecurityCheckSlide";
import FirstLoginSlide from "@editor/components/onboarding/slides/FirstLoginSlide";
import TourOverviewSlide from "@editor/components/onboarding/slides/TourOverviewSlide";
import MFASetupSlide from "@editor/components/onboarding/slides/MFASetupSlide";
import type {
  ButtonDefinition as ButtonDefinitionBase,
  HeroDefinition as HeroDefinitionBase,
  SlideDefinition as SlideDefinitionBase,
} from "@editor/components/onboarding/onboardingSlideTypes";

export type SlideId =
  | "first-login"
  | "welcome"
  | "security-check"
  | "tour-overview"
  | "mfa-setup";

export type HeroType = "rocket" | "shield" | "lock";

export type ButtonAction =
  | "next"
  | "prev"
  | "close"
  | "complete-close"
  | "security-next"
  | "launch-tools"
  | "launch-auto"
  | "skip-tour";

export interface FlowState {
  selectedRole: "admin" | "user" | null;
}

export interface SlideFactoryParams {
  selectedRole: "admin" | "user" | null;
  onRoleSelect: (role: "admin" | "user" | null) => void;
  // First login params
  firstLoginUsername?: string;
  onPasswordChanged?: () => void;
  usingDefaultCredentials?: boolean;
  onMfaSetupComplete?: () => void;
}

export type HeroDefinition = HeroDefinitionBase<HeroType>;

export type ButtonDefinition = ButtonDefinitionBase<ButtonAction, FlowState>;

export type SlideDefinition = SlideDefinitionBase<
  SlideId,
  ButtonAction,
  FlowState,
  HeroType,
  SlideFactoryParams
>;

export const SLIDE_DEFINITIONS: Record<SlideId, SlideDefinition> = {
  "first-login": {
    id: "first-login",
    createSlide: ({
      firstLoginUsername,
      onPasswordChanged,
      usingDefaultCredentials,
    }) =>
      FirstLoginSlide({
        username: firstLoginUsername || "",
        onPasswordChanged: onPasswordChanged || (() => {}),
        usingDefaultCredentials: usingDefaultCredentials || false,
      }),
    hero: { type: "lock" },
    buttons: [], // Form has its own submit button
  },
  welcome: {
    id: "welcome",
    createSlide: () => WelcomeSlide(),
    hero: { type: "rocket" },
    buttons: [
      {
        key: "welcome-next",
        type: "button",
        label: "onboarding.buttons.next",
        variant: "primary",
        group: "right",
        action: "next",
      },
    ],
  },
  "security-check": {
    id: "security-check",
    createSlide: ({ selectedRole, onRoleSelect }) =>
      SecurityCheckSlide({ selectedRole, onRoleSelect }),
    hero: { type: "shield" },
    buttons: [
      {
        key: "security-back",
        type: "button",
        label: "onboarding.buttons.back",
        variant: "secondary",
        group: "left",
        action: "prev",
      },
      {
        key: "security-next",
        type: "button",
        label: "onboarding.buttons.next",
        variant: "primary",
        group: "right",
        action: "security-next",
        disabledWhen: (state) => !state.selectedRole,
      },
    ],
  },
  "tour-overview": {
    id: "tour-overview",
    createSlide: () => TourOverviewSlide(),
    hero: { type: "rocket" },
    buttons: [
      {
        key: "tour-overview-back",
        type: "icon",
        icon: "chevron-left",
        group: "left",
        action: "prev",
      },
      {
        key: "tour-overview-skip",
        type: "button",
        label: "onboarding.buttons.skipForNow",
        variant: "secondary",
        group: "left",
        action: "skip-tour",
      },
      {
        key: "tour-overview-show",
        type: "button",
        label: "onboarding.buttons.showMeAround",
        variant: "primary",
        group: "right",
        action: "launch-tools",
      },
    ],
  },
  "mfa-setup": {
    id: "mfa-setup",
    createSlide: ({ onMfaSetupComplete = () => {} }: SlideFactoryParams) =>
      MFASetupSlide({ onMfaSetupComplete }),
    hero: { type: "lock" },
    buttons: [], // Form has its own submit button
  },
};
