import type {Group, GroupMode} from '../types';

export interface ProductModeCopy {
  id: GroupMode;
  label: string;
  eyebrow: string;
  description: string;
  nextAction: string;
  createAction: string;
  defaultName: string;
  totalLabel: string;
  emptyLabel: string;
  addAction: string;
  reviewTitle: string;
  saveAction: string;
  closeAction: string;
  capture: 'receipt' | 'amount';
  amountLabel: string;
  reasonLabel: string;
  reasonPlaceholder: string;
  fixedReason?: string;
  privacyNote?: string;
}

export const PRODUCT_MODES: Readonly<Record<GroupMode, ProductModeCopy>> = {
  normal_pot: {
    id: 'normal_pot',
    label: 'Shared pot',
    eyebrow: 'Dinner, home or everyday',
    description: 'Catch a receipt, split it and keep one clear record.',
    nextAction: 'Scan a receipt',
    createAction: 'Start a shared pot',
    defaultName: 'Shared pot',
    totalLabel: 'Total spent',
    emptyLabel: 'No receipts yet',
    addAction: 'Scan a receipt',
    reviewTitle: 'Review split',
    saveAction: 'Save spend',
    closeAction: 'Finish group',
    capture: 'receipt',
    amountLabel: 'Total',
    reasonLabel: 'Merchant or reason',
    reasonPlaceholder: 'e.g. Dinner at Gusto',
  },
  trip: {
    id: 'trip',
    label: 'Trip',
    eyebrow: 'Travel with friends',
    description: 'Catch each shared spend without turning the trip into bookkeeping.',
    nextAction: 'Scan a trip receipt',
    createAction: 'Start a trip',
    defaultName: 'Weekend trip',
    totalLabel: 'Trip total',
    emptyLabel: 'No trip receipts yet',
    addAction: 'Scan a receipt',
    reviewTitle: 'Review trip split',
    saveAction: 'Save trip spend',
    closeAction: 'Finish trip',
    capture: 'receipt',
    amountLabel: 'Total',
    reasonLabel: 'Place or reason',
    reasonPlaceholder: 'e.g. Train to Bern',
  },
  couple: {
    id: 'couple',
    label: 'Couple',
    eyebrow: 'Shared everyday costs',
    description: 'Keep shared expenses clear without tallying every conversation.',
    nextAction: 'Scan a shared receipt',
    createAction: 'Start together',
    defaultName: 'Our shared costs',
    totalLabel: 'Shared total',
    emptyLabel: 'No shared receipts yet',
    addAction: 'Scan a receipt',
    reviewTitle: 'Review shared split',
    saveAction: 'Save shared spend',
    closeAction: 'Save this period',
    capture: 'receipt',
    amountLabel: 'Total',
    reasonLabel: 'Merchant or reason',
    reasonPlaceholder: 'e.g. Groceries',
  },
  spend_card: {
    id: 'spend_card',
    label: 'Spend Card',
    eyebrow: 'Receipt matching',
    description: 'Match a receipt to a group purchase before anyone is asked to pay.',
    nextAction: 'Match a receipt',
    createAction: 'Start Spend Card',
    defaultName: 'Spend Card',
    totalLabel: 'Matched spend',
    emptyLabel: 'No matched receipts yet',
    addAction: 'Match a receipt',
    reviewTitle: 'Review card spend',
    saveAction: 'Save matched spend',
    closeAction: 'Finish this statement',
    capture: 'receipt',
    amountLabel: 'Transaction total',
    reasonLabel: 'Merchant',
    reasonPlaceholder: 'e.g. Gusto Zurich',
  },
  savings_circle: {
    id: 'savings_circle',
    label: 'Savings circle',
    eyebrow: 'One round at a time',
    description: 'Record this round’s contributions and confirm the handoff.',
    nextAction: 'Record a contribution',
    createAction: 'Start a savings circle',
    defaultName: 'Savings circle',
    totalLabel: 'Round total',
    emptyLabel: 'No contributions this round',
    addAction: 'Record contribution',
    reviewTitle: 'Review contribution',
    saveAction: 'Save contribution',
    closeAction: 'Finish this round',
    capture: 'amount',
    amountLabel: 'Contribution',
    reasonLabel: 'Round note',
    reasonPlaceholder: 'e.g. August contribution',
  },
  emergency_pot: {
    id: 'emergency_pot',
    label: 'Emergency pot',
    eyebrow: 'Private group support',
    description: 'Coordinate urgent support while keeping the private reason off the shared record.',
    nextAction: 'Contribute privately',
    createAction: 'Start an emergency pot',
    defaultName: 'Private support',
    totalLabel: 'Support total',
    emptyLabel: 'No contributions yet',
    addAction: 'Contribute privately',
    reviewTitle: 'Review contribution',
    saveAction: 'Save contribution',
    closeAction: 'Finish support record',
    capture: 'amount',
    amountLabel: 'Contribution',
    reasonLabel: 'Saved description',
    reasonPlaceholder: 'Private support',
    fixedReason: 'Private support',
    privacyNote: 'The private reason is not collected or saved here.',
  },
  community_fund: {
    id: 'community_fund',
    label: 'Community fund',
    eyebrow: 'Shared contribution decisions',
    description: 'Review one proposal, collect contributions and confirm the handoff.',
    nextAction: 'Review a proposal',
    createAction: 'Start a community fund',
    defaultName: 'Community fund',
    totalLabel: 'Proposal total',
    emptyLabel: 'No proposal recorded yet',
    addAction: 'Review proposal',
    reviewTitle: 'Review proposal',
    saveAction: 'Save proposal',
    closeAction: 'Finish fund record',
    capture: 'amount',
    amountLabel: 'Proposed amount',
    reasonLabel: 'Proposal',
    reasonPlaceholder: 'e.g. Repair the shared garden',
    privacyNote: 'Only the proposal and amount are shared with this group.',
  },
};

export const PRODUCT_MODE_ORDER: readonly GroupMode[] = [
  'normal_pot',
  'trip',
  'couple',
  'spend_card',
  'savings_circle',
  'emergency_pot',
  'community_fund',
];

export function groupMode(group: Pick<Group, 'mode'> | undefined): GroupMode {
  return group?.mode && PRODUCT_MODES[group.mode] ? group.mode : 'normal_pot';
}

export function modeCopy(group: Pick<Group, 'mode'> | undefined): ProductModeCopy {
  return PRODUCT_MODES[groupMode(group)];
}
