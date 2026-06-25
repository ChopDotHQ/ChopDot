export type TestTokenCurrency = 'TEST_USD' | 'TEST_USDC' | 'TEST_DOT';
export type TestTokenTransferState = 'available' | 'pending' | 'completed' | 'failed';

export type TestTokenBalance = {
  participantId: string;
  currency: TestTokenCurrency;
  available: number;
};

export type TestTokenTransfer = {
  id: string;
  subjectId: string;
  fromParticipantId: string;
  toParticipantId: string;
  amount: number;
  currency: TestTokenCurrency;
  state: Exclude<TestTokenTransferState, 'available'>;
  note: string;
};

export type TestTokenRailState = {
  balances: TestTokenBalance[];
  transfers: TestTokenTransfer[];
};

type RequestTransferInput = Omit<TestTokenTransfer, 'id' | 'state'> & {
  state?: TestTokenTransfer['state'];
};

function nextTransferId(transfers: TestTokenTransfer[]): string {
  return `test_transfer_${transfers.length + 1}`;
}

function assertPositiveAmount(amount: number): void {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('Test-token amount must be greater than zero');
  }
}

function findBalance(
  rail: TestTokenRailState,
  participantId: string,
  currency: TestTokenCurrency,
): TestTokenBalance {
  const balance = rail.balances.find(
    (item) => item.participantId === participantId && item.currency === currency,
  );
  if (!balance) {
    throw new Error(`Missing test-token balance for ${participantId}`);
  }
  return balance;
}

export function createTestTokenRail(balances: TestTokenBalance[]): TestTokenRailState {
  return { balances, transfers: [] };
}

export function requestTestTokenTransfer(
  rail: TestTokenRailState,
  input: RequestTransferInput,
): TestTokenRailState {
  assertPositiveAmount(input.amount);
  if (
    rail.transfers.some(
      (item) =>
        item.subjectId === input.subjectId &&
        item.fromParticipantId === input.fromParticipantId &&
        item.state !== 'failed',
    )
  ) {
    throw new Error('Duplicate test-token transfer for this action');
  }
  const balance = findBalance(rail, input.fromParticipantId, input.currency);
  if (balance.available < input.amount) {
    throw new Error('Insufficient test-token balance');
  }
  const transfer: TestTokenTransfer = {
    ...input,
    id: nextTransferId(rail.transfers),
    state: input.state ?? 'pending',
  };
  return {
    balances: rail.balances.map((item) =>
      item.participantId === input.fromParticipantId && item.currency === input.currency
        ? { ...item, available: item.available - input.amount }
        : item,
    ),
    transfers: [...rail.transfers, transfer],
  };
}

export function completeTestTokenTransfer(
  rail: TestTokenRailState,
  transferId: string,
): TestTokenRailState {
  const transfer = rail.transfers.find((item) => item.id === transferId);
  if (!transfer) {
    throw new Error('Unknown test-token transfer');
  }
  if (transfer.state !== 'pending') {
    throw new Error('Only pending test-token transfers can complete');
  }
  return {
    balances: rail.balances.map((item) =>
      item.participantId === transfer.toParticipantId && item.currency === transfer.currency
        ? { ...item, available: item.available + transfer.amount }
        : item,
    ),
    transfers: rail.transfers.map((item) =>
      item.id === transferId ? { ...item, state: 'completed' } : item,
    ),
  };
}

export function failTestTokenTransfer(
  rail: TestTokenRailState,
  transferId: string,
): TestTokenRailState {
  const transfer = rail.transfers.find((item) => item.id === transferId);
  if (!transfer) {
    throw new Error('Unknown test-token transfer');
  }
  if (transfer.state !== 'pending') {
    throw new Error('Only pending test-token transfers can fail');
  }
  return {
    balances: rail.balances.map((item) =>
      item.participantId === transfer.fromParticipantId && item.currency === transfer.currency
        ? { ...item, available: item.available + transfer.amount }
        : item,
    ),
    transfers: rail.transfers.map((item) =>
      item.id === transferId ? { ...item, state: 'failed' } : item,
    ),
  };
}
