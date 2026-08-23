export type ChopModeV1 =
  | 'normal_pot'
  | 'trip'
  | 'couple'
  | 'spend_card'
  | 'savings_circle'
  | 'emergency_pot'
  | 'community_fund';

export interface ModePolicyV1 {
  readonly v: 1;
  readonly mode: ChopModeV1;
  readonly authority: 'participant_signed_events';
  readonly money: 'exact_minor_units';
  readonly custody: 'none';
  readonly confirmation: 'receiver_confirmed';
  readonly close: 'all_required_items_resolved';
  readonly privacy: 'group_encrypted' | 'minimum_disclosure';
}

const common = {
  v: 1,
  authority: 'participant_signed_events',
  money: 'exact_minor_units',
  custody: 'none',
  confirmation: 'receiver_confirmed',
  close: 'all_required_items_resolved',
} as const;

function policy(mode: ChopModeV1, privacy: ModePolicyV1['privacy']): Readonly<ModePolicyV1> {
  return Object.freeze({...common, mode, privacy});
}

/**
 * Mode differences are policy data over One Chop Core. They cannot replace
 * signed event authority, exact money, receiver confirmation, or close rules.
 */
export const MODE_POLICIES_V1: Readonly<Record<ChopModeV1, Readonly<ModePolicyV1>>> = Object.freeze({
  normal_pot: policy('normal_pot', 'group_encrypted'),
  trip: policy('trip', 'group_encrypted'),
  couple: policy('couple', 'group_encrypted'),
  spend_card: policy('spend_card', 'group_encrypted'),
  savings_circle: policy('savings_circle', 'group_encrypted'),
  emergency_pot: policy('emergency_pot', 'minimum_disclosure'),
  community_fund: policy('community_fund', 'minimum_disclosure'),
});

export function modePolicyV1(mode: ChopModeV1): Readonly<ModePolicyV1> {
  return MODE_POLICIES_V1[mode];
}
