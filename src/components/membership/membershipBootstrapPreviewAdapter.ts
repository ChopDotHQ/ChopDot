export type MembershipBootstrapRoute = 'link' | 'qr' | 'forwarded' | 'expired' | 'limited';

export type MembershipBootstrapState =
  | 'decision'
  | 'accepted_pending_grant'
  | 'joined'
  | 'declined'
  | 'wrong_person'
  | 'expired'
  | 'limited_decision'
  | 'limited_opened'
  | 'limited_declined';

/** Provider-neutral UI edge. A future live adapter must source this state from
 * the same signed membership authority used by the trusted-contact ceremony. */
export interface MembershipBootstrapPreviewAdapter {
  readonly route: MembershipBootstrapRoute;
  readonly canonicalUrl?: string;
  readonly qrText?: string;
  getState(): MembershipBootstrapState;
  accept(): Promise<void>;
  decline(): Promise<void>;
  grant(): Promise<void>;
  openLimitedAction(): Promise<void>;
}

export function createLimitedDinnerActionPreviewAdapter(
): MembershipBootstrapPreviewAdapter {
  let state: MembershipBootstrapState = 'limited_decision';
  const requireState = (expected: MembershipBootstrapState) => {
    if (state !== expected) throw new Error('This invitation action is no longer available.');
  };
  return {
    route: 'limited',
    getState: () => state,
    async accept() { throw new Error('This dinner action cannot create membership.'); },
    async decline() {
      if (state === 'limited_decision') state = 'limited_declined';
      else throw new Error('This invitation action is no longer available.');
    },
    async grant() { throw new Error('This dinner action cannot create membership.'); },
    async openLimitedAction() {
      requireState('limited_decision');
      state = 'limited_opened';
    },
  };
}

export function parseMembershipBootstrapRoute(value: string | null): MembershipBootstrapRoute {
  return ['link', 'qr', 'forwarded', 'expired', 'limited'].includes(value ?? '')
    ? value as MembershipBootstrapRoute
    : 'link';
}
