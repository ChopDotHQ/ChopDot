export type ChatSkin = 'whatsapp' | 'telegram';

export type PersonaId = 'alex' | 'sam' | 'jordan';

export type LoopBeat = 'catch' | 'show' | 'move' | 'end';

export type CatchSolutionId =
  | 'C01'
  | 'C02'
  | 'C04'
  | 'C07'
  | 'C20';

export type CatchMockKind =
  | 'bot-nl-parse'
  | 'bot-receipt-parse'
  | 'email-ingest'
  | 'card-group-picker'
  | 'sheet-retype';

export type ManagementSolutionId = 'M01' | 'M02' | 'M03' | 'M05' | 'M15';

export type ManagementMockKind =
  | 'balance-only-trap'
  | 'open-legs-board'
  | 'claimed-not-confirmed'
  | 'status-pin'
  | 'next-actor-nudge';

export type PayoutSolutionId = 'P01' | 'P02' | 'P03' | 'P04' | 'P20';

export type PayoutMockKind =
  | 'deep-link-pay'
  | 'paid-confirm-flow'
  | 'close-blocked';

export type HistorySolutionId = 'H01' | 'H02' | 'H06' | 'H07' | 'H05';

export type HistoryMockKind =
  | 'close-gate'
  | 'export-json'
  | 'optional-seal';

export type ScenarioStep = {
  id: string;
  beat: LoopBeat;
  persona?: PersonaId;
  message?: string;
  systemNote?: string;
  botReply?: string;
  catchSolutionId?: CatchSolutionId;
  catchMock?: CatchMockKind;
  managementSolutionId?: ManagementSolutionId;
  managementMock?: ManagementMockKind;
  payoutSolutionId?: PayoutSolutionId;
  payoutMock?: PayoutMockKind;
  historySolutionId?: HistorySolutionId;
  historyMock?: HistoryMockKind;
  chopdotAction: string;
  stateExpectation: string;
};

export type GroupMoneyScenario = {
  id: string;
  title: string;
  chapter: string;
  skin: ChatSkin;
  personas: Record<
    PersonaId,
    { name: string; role: string; color: string }
  >;
  steps: ScenarioStep[];
};
