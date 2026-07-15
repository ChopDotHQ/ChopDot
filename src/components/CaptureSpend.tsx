import {useState} from 'react';
import {CaptureDraftContext, CaptureSource, ReceiptDraftStatus} from '../capture/receiptDraft';
import {useAppState} from '../state/AppStateContext';
import {getCurrencySymbol} from '../utils';
import {BottomAction, Button, Screen, ScreenContent, ScreenHeader} from './primitives';

interface CaptureSpendProps {
  groupId: string;
  initialAmount?: number;
  initialTitle?: string;
  initialSource?: CaptureSource;
  initialReceiptStatus?: ReceiptDraftStatus;
  initialFileName?: string;
  onBack: () => void;
  onNext: (amount: number, title: string, context: CaptureDraftContext) => void;
}

export function CaptureSpend({
  groupId,
  initialAmount,
  initialTitle,
  initialSource,
  initialReceiptStatus,
  initialFileName,
  onBack,
  onNext,
}: CaptureSpendProps) {
  const {state} = useAppState();
  const group = state.groups[groupId];
  const currentUser = state.currentUserId ? state.users[state.currentUserId] : undefined;
  const sym = getCurrencySymbol(state.currency);
  const [amount, setAmount] = useState(() => initialAmount ? String(initialAmount) : '');
  const [title, setTitle] = useState(() => initialTitle ?? '');

  if (!group || !currentUser) return null;

  const numAmount = Number.parseFloat(amount);
  const isValid = Number.isFinite(numAmount) && numAmount > 0 && title.trim().length > 0;
  const context: CaptureDraftContext = {
    source: initialSource ?? 'manual',
    receiptStatus: initialReceiptStatus,
    fileName: initialFileName,
  };

  return (
    <Screen>
      <ScreenHeader title="Add spend" onBack={onBack} />

      <ScreenContent className="px-6 py-7">
        <div className="space-y-8">
          <div>
            <label htmlFor="capture-amount" className="block text-sm font-medium text-gray-500 dark:text-gray-400">
              Total
            </label>
            <div className="mt-2 flex items-baseline border-b border-gray-300 pb-3 dark:border-gray-700">
              <span className="mr-2 text-3xl text-gray-400 dark:text-gray-600">{sym}</span>
              <input
                id="capture-amount"
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                value={amount}
                onChange={event => setAmount(event.target.value)}
                className="min-w-0 flex-1 bg-transparent text-5xl font-semibold tracking-tight text-gray-950 outline-none placeholder:text-gray-300 dark:text-white dark:placeholder:text-gray-700"
              />
            </div>
          </div>

          <div>
            <label htmlFor="capture-title" className="block text-sm font-medium text-gray-500 dark:text-gray-400">
              Merchant or reason
            </label>
            <input
              id="capture-title"
              type="text"
              placeholder="e.g. Dinner at Gusto"
              value={title}
              onChange={event => setTitle(event.target.value)}
              className="mt-2 w-full border-b border-gray-300 bg-transparent py-3 text-xl font-medium text-gray-950 outline-none transition-colors placeholder:text-gray-300 focus:border-gray-950 dark:border-gray-700 dark:text-white dark:placeholder:text-gray-700 dark:focus:border-white"
            />
          </div>

          <dl className="divide-y divide-gray-200 border-y border-gray-200 text-sm dark:divide-gray-800 dark:border-gray-800">
            <div className="flex items-center justify-between py-4">
              <dt className="text-gray-500 dark:text-gray-400">Paid by</dt>
              <dd className="font-semibold text-gray-950 dark:text-white">{currentUser.name}</dd>
            </div>
            <div className="flex items-center justify-between py-4">
              <dt className="text-gray-500 dark:text-gray-400">Group</dt>
              <dd className="max-w-[210px] truncate font-semibold text-gray-950 dark:text-white">{group.name}</dd>
            </div>
          </dl>
        </div>
      </ScreenContent>

      <BottomAction>
        <Button
          fullWidth
          onClick={() => onNext(numAmount, title.trim(), context)}
          disabled={!isValid}
        >
          Review split
        </Button>
      </BottomAction>
    </Screen>
  );
}
