import type { PoliciesByKey, PolicyState } from "@editor/types/policies";

export const POLICIES_CHANGE_EVENT = "promin:local-policies-changed";

export function clearPolicies(): void {}

export function loadPolicies(): PoliciesByKey {
  return {};
}

export function rawStoredPolicies(): string | null {
  return null;
}

export function isEnforcedPolicy(_policyKey: string | undefined): boolean {
  return false;
}

export function updatePolicy(
  _policyKey: string,
  _patch: Partial<PolicyState>,
): PoliciesByKey {
  return {};
}

export function forgetPolicies(_ids: string[]): PoliciesByKey {
  return {};
}

export function onPoliciesChange(_callback: () => void): () => void {
  return () => {};
}
