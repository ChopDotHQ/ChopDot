import type { BaseCurrency } from '../schema/pot';

export const CHOPDOT_CHAPTER_SCHEMA = '0.2.0' as const;

export type ChapterState = 'open' | 'closed';

export type LegState = 'open' | 'claimed' | 'confirmed';

export type CatchSource =
  | 'chat_nl'
  | 'receipt_vision'
  | 'manual'
  | 'spend_card'
  | 'pay_link'
  | 'qr';

export type PaymentEvidenceRef = {
  id: string;
  kind: 'checkout_request' | 'receipt' | 'payment_reference';
  source: 'manual_checkout' | 't3rminal' | 'w3spay' | 'coinage' | 'asset_hub' | 'unknown';
  status: 'observed' | 'submitted' | 'settled' | 'unconfirmed' | 'failed';
  capturedAt: string;
  display: string;
  rawHash: string;
  amount?: number;
  currency?: string;
  merchantName?: string;
  terminalId?: string;
  paymentId?: string;
  receiptId?: string;
};

export type ReceiptCaptureItem = {
  id: string;
  label: string;
  amount: number;
  assignedMemberIds: string[];
};

export type ChapterMember = {
  id: string;
  name: string;
  telegramUserId?: string;
  userId?: string;
};

export type SpendCardConfig = {
  id: string;
  label: string;
  recentParticipantIds: string[];
  settlementPreference:
    | 'twint'
    | 'bank'
    | 'wise'
    | 'revolut'
    | 'venmo'
    | 'cashapp'
    | 'outside'
    | 'asset_hub'
    | 'coinage'
    | 'dot'
    | 'pas'
    | 'usdc'
    | 'paypal'
    | 'firma';
  defaultSplitRule: 'equal';
  walletPassExternalId?: string;
};

export type ChapterExpense = {
  id: string;
  amount: number;
  currency: string;
  paidBy: string;
  memo: string;
  createdAt: string;
  splitMemberIds: string[];
  source: CatchSource;
  sourceRef?: string;
  evidenceRefs?: PaymentEvidenceRef[];
  receiptItems?: ReceiptCaptureItem[];
};

export type SettlementLeg = {
  id: string;
  fromMemberId: string;
  toMemberId: string;
  amount: number;
  currency: string;
  state: LegState;
  claimedAt?: string;
  confirmedAt?: string;
};

export type ChapterDocument = {
  schemaVersion: typeof CHOPDOT_CHAPTER_SCHEMA;
  id: string;
  name: string;
  currency: BaseCurrency;
  chapterState: ChapterState;
  potId?: string;
  telegramChatId?: string;
  members: ChapterMember[];
  expenses: ChapterExpense[];
  legs: SettlementLeg[];
  spendCards?: SpendCardConfig[];
  createdAt: string;
  closedAt?: string;
};

export type PotStatus = {
  potId: string;
  name: string;
  chapterState: ChapterState;
  openLegCount: number;
  legs: Array<
    SettlementLeg & {
      fromName: string;
      toName: string;
      nextActor?: string;
      nextAction?: 'pay' | 'confirm';
    }
  >;
  blockers: string[];
  updatedAt: string;
};

export type ParsedExpenseDraft = {
  amount: number;
  memo: string;
  splitCount?: number;
};

/** Legacy schema version before CAPTURE P1a */
export const CHOPDOT_CHAPTER_SCHEMA_V1 = '0.1.0' as const;

export type ChapterDocumentV1 = Omit<
  ChapterDocument,
  'schemaVersion' | 'potId' | 'spendCards' | 'telegramChatId'
> & {
  schemaVersion: typeof CHOPDOT_CHAPTER_SCHEMA_V1;
  telegramChatId: string;
};
