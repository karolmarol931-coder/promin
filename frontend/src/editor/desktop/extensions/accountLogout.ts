type SignOutFn = () => Promise<void>;

interface AccountLogoutDeps {
  signOut: SignOutFn;
  redirectToLogin: () => void;
}

export function useAccountLogout() {
  return async (_deps: AccountLogoutDeps): Promise<void> => {
    void _deps;
  };
}
