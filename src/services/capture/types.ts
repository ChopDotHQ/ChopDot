import type { PaymentEvidenceRef, ReceiptCaptureItem } from '../../chapter/types';

export type SpendSessionStatus =
  | 'draft'
  | 'handoff_started'
  | 'claimed'
  | 'cleared'
  | 'confirmed'
  | 'closed'
  | 'committed'
  | 'expired';

export type CaptureRailStatus =
  | 'ready_to_pay'
  | 'handoff_started'
  | 'claimed'
  | 'cleared'
  | 'needs_confirmation'
  | 'failed';

export type SpendSession = {
  id: string;
  spendCardId: string;
  potId: string;
  payerMemberId: string;
  participantIds: string[];
  amount: number;
  currency: string;
  memo: string;
  paymentEvidence?: PaymentEvidenceRef;
  receiptItems?: ReceiptCaptureItem[];
  settlementRail?: 'twint' | 'venmo' | 'cashapp' | 'bank' | 'wise' | 'revolut' | 'asset_hub' | 'coinage' | 'dot' | 'pas' | 'usdc' | 'outside';
  railStatus?: CaptureRailStatus;
  status: SpendSessionStatus;
  createdAt: string;
  expiresAt: string;
  committedExpenseId?: string;
};

export type CaptureLinkType = 'pay' | 'spend' | 'confirm';

export type PayTokenPayload = {
  chapterId: string;
  potId: string;
  legId: string;
  fromMemberId: string;
  toMemberId: string;
  toMemberName?: string;
  amount: number;
  currency: string;
  exp: number;
};

export type SpendTokenPayload = {
  chapterId: string;
  potId: string;
  spendSessionId: string;
  payerId: string;
  spendCardId?: string;
  exp: number;
};

export type ConfirmTokenPayload = {
  chapterId: string;
  potId: string;
  legId: string;
  receiverId: string;
  receiverName?: string;
  exp: number;
};

export type CaptureLinkPayload = PayTokenPayload | SpendTokenPayload | ConfirmTokenPayload;

export type CaptureLinkTokenRecord = {
  token: string;
  type: CaptureLinkType;
  payload: CaptureLinkPayload;
  consumedAt?: string;
};

export type CaptureLinkResolveResult =
  | { type: 'pay'; payload: PayTokenPayload; token: string }
  | { type: 'spend'; payload: SpendTokenPayload; token: string }
  | { type: 'confirm'; payload: ConfirmTokenPayload; token: string };

export type CaptureLinkErrorCode = 'not_found' | 'expired' | 'consumed' | 'wrong_user';

export class CaptureLinkError extends Error {
  readonly code: CaptureLinkErrorCode;
  readonly expectedName?: string;

  constructor(code: CaptureLinkErrorCode, message: string, expectedName?: string) {
    super(message);
    this.name = 'CaptureLinkError';
    this.code = code;
    this.expectedName = expectedName;
  }
}
