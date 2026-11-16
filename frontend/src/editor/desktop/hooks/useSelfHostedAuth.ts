export interface SelfHostedAuthState {
  isSelfHosted: boolean;
  isAuthenticated: boolean;
  loading: boolean;
}

export function useSelfHostedAuth(): SelfHostedAuthState {
  return {
    isSelfHosted: false,
    isAuthenticated: false,
    loading: false,
  };
}
