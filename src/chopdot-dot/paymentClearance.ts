export type PaymentEvidenceSource =
  | 'self_report'
  | 'receiver_confirmation'
  | 'asset_hub_transfer'
  | 'coinage'
  | 'w3spay'
  | 't3rminal'
  | 'escrow';

export type PaymentEvidenceLifecycle =
  | 'observed'
  | 'submitted'
  | 'in_block'
  | 'finalized'
  | 'settled'
  | 'confirmed_by_receiver'
  | 'deposited'
  | 'released'
  | 'failed'
  | 'rejected'
  | 'timeout'
  | 'unknown';

export type PaymentSubjectKind = 'contribution' | 'expense_leg' | 'release';

export type PaymentClearanceInput = {
  source: PaymentEvidenceSource;
  lifecycle: PaymentEvidenceLifecycle;
  subjectKind: PaymentSubjectKind;
  amountMatches?: boolean;
  expectedRecipientMatched?: boolean;
  recipientObserved?: boolean;
};

export type PaymentClearanceDecision = {
  state: 'none' | 'claimed' | 'held' | 'received' | 'released' | 'failed';
  clearsPayment: boolean;
  requiresHumanConfirmation: boolean;
  closeoutEffect: 'none' | 'subject_clear' | 'chapter_rule_check';
  userLabel: string;
  reason: string;
};

function hasVerifiedReceipt(input: PaymentClearanceInput): boolean {
  return input.amountMatches === true && input.expectedRecipientMatched === true;
}

function failed(input: PaymentClearanceInput): boolean {
  return input.lifecycle === 'failed' || input.lifecycle === 'rejected' || input.lifecycle === 'timeout';
}

export function classifyPaymentClearance(input: PaymentClearanceInput): PaymentClearanceDecision {
  if (failed(input)) {
    return {
      state: 'failed',
      clearsPayment: false,
      requiresHumanConfirmation: false,
      closeoutEffect: 'none',
      userLabel: 'Payment did not go through',
      reason: 'The payment source reported a failed, rejected, or timed-out movement.',
    };
  }

  if (input.source === 'receiver_confirmation' || input.lifecycle === 'confirmed_by_receiver') {
    return {
      state: 'received',
      clearsPayment: true,
      requiresHumanConfirmation: false,
      closeoutEffect: 'chapter_rule_check',
      userLabel: 'Received',
      reason: 'The receiver confirmed that money arrived.',
    };
  }

  if (input.source === 'self_report') {
    return {
      state: 'claimed',
      clearsPayment: false,
      requiresHumanConfirmation: true,
      closeoutEffect: 'none',
      userLabel: 'Marked paid',
      reason: 'A participant said they paid, but receipt has not been verified.',
    };
  }

  if (input.source === 'escrow' && input.lifecycle === 'deposited') {
    return {
      state: 'held',
      clearsPayment: false,
      requiresHumanConfirmation: false,
      closeoutEffect: 'none',
      userLabel: 'Held',
      reason: 'The contract shows value is held, but the recipient has not received it yet.',
    };
  }

  if (input.source === 'escrow' && input.lifecycle === 'released') {
    if (hasVerifiedReceipt(input)) {
      return {
        state: input.subjectKind === 'release' ? 'released' : 'received',
        clearsPayment: true,
        requiresHumanConfirmation: false,
        closeoutEffect: 'chapter_rule_check',
        userLabel: input.subjectKind === 'release' ? 'Released' : 'Received',
        reason: 'The release was verified against the expected recipient and amount.',
      };
    }

    return {
      state: 'released',
      clearsPayment: false,
      requiresHumanConfirmation: true,
      closeoutEffect: 'subject_clear',
      userLabel: 'Released, needs check',
      reason: 'The contract released value, but ChopDot has not verified the recipient and amount.',
    };
  }

  if (
    input.lifecycle === 'finalized' ||
    input.lifecycle === 'settled' ||
    input.recipientObserved === true
  ) {
    if (hasVerifiedReceipt(input) || input.recipientObserved === true) {
      return {
        state: 'received',
        clearsPayment: true,
        requiresHumanConfirmation: false,
        closeoutEffect: 'chapter_rule_check',
        userLabel: 'Received',
        reason: 'The rail evidence verifies that the expected recipient received the expected payment.',
      };
    }

    return {
      state: 'claimed',
      clearsPayment: false,
      requiresHumanConfirmation: true,
      closeoutEffect: 'none',
      userLabel: 'Payment evidence found',
      reason: 'The rail shows payment activity, but recipient and amount matching are not strong enough to clear it.',
    };
  }

  return {
    state: 'claimed',
    clearsPayment: false,
    requiresHumanConfirmation: true,
    closeoutEffect: 'none',
    userLabel: 'Payment started',
    reason: 'The payment is not failed, but it is not verified as received yet.',
  };
}
