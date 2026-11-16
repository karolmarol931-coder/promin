import type { SigningMenuItem } from "@editor/utils/signingItems";

export interface QuickNavIdentity {
  displayName: string;
  profilePictureUrl: string | null;
}

/** The last resolved account data, retained across view changes. */
export interface QuickNavAccount {
  accountId: string | null;
  isAnonymous: boolean;
  identity: QuickNavIdentity | null;
  signingBadge: number;
  signingItems: SigningMenuItem[];
}

/** Undefined fields retain their previous value; null, false and zero replace it. */
export type QuickNavAccountUpdate = Partial<QuickNavAccount>;

export const EMPTY_QUICK_NAV_ACCOUNT: QuickNavAccount = {
  accountId: null,
  isAnonymous: false,
  identity: null,
  signingBadge: 0,
  signingItems: [],
};

/** Clears the previous account before applying an update for a different account. */
export function updateQuickNavAccount(
  previous: QuickNavAccount,
  update: QuickNavAccountUpdate,
): QuickNavAccount {
  const accountId =
    update.accountId === undefined ? previous.accountId : update.accountId;
  const current =
    accountId === previous.accountId ? previous : EMPTY_QUICK_NAV_ACCOUNT;
  const next: QuickNavAccount = {
    accountId,
    isAnonymous: update.isAnonymous ?? current.isAnonymous,
    identity:
      update.identity === undefined ? current.identity : update.identity,
    signingBadge: update.signingBadge ?? current.signingBadge,
    signingItems: update.signingItems ?? current.signingItems,
  };

  const unchanged =
    next.accountId === previous.accountId &&
    next.isAnonymous === previous.isAnonymous &&
    next.signingBadge === previous.signingBadge &&
    next.signingItems === previous.signingItems &&
    next.identity?.displayName === previous.identity?.displayName &&
    next.identity?.profilePictureUrl === previous.identity?.profilePictureUrl;
  return unchanged ? previous : next;
}
