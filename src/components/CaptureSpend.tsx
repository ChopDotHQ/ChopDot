import {ChangeEvent, FormEvent, useRef, useState} from 'react';
import {FileText, Keyboard, Link2, Upload} from 'lucide-react';
import {CaptureDraftContext, CaptureSource, extractReceiptDraft, ReceiptDraftStatus} from '../capture/receiptDraft';
import {useAppState} from '../state/AppStateContext';
import {getCurrencySymbol} from '../utils';
import {BottomAction, Button, Screen, ScreenContent, ScreenHeader} from './primitives';
import {modeCopy} from './productModes';
import {moneyFromDecimal} from '../core/money';

interface CaptureSpendProps {
  groupId: string;
  initialAmount?: string;
  initialTitle?: string;
  initialSource?: CaptureSource;
  initialReceiptStatus?: ReceiptDraftStatus;
  initialFileName?: string;
  onBack: () => void;
  onNext: (amount: string, title: string, context: CaptureDraftContext) => void;
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
  const copy = modeCopy(group);
  const sym = getCurrencySymbol(state.currency);
  const [amount, setAmount] = useState(() => initialAmount ?? '');
  const [title, setTitle] = useState(() => initialTitle ?? copy.fixedReason ?? '');
  const [source, setSource] = useState<CaptureSource>(() => initialSource ?? (copy.capture === 'amount' ? 'manual' : 'receipt'));
  const [receiptStatus, setReceiptStatus] = useState<ReceiptDraftStatus | undefined>(initialReceiptStatus);
  const [fileName, setFileName] = useState(initialFileName);
  const [isReading, setIsReading] = useState(false);
  const [showCorrection, setShowCorrection] = useState(() => copy.capture === 'amount' || Boolean(initialAmount || initialTitle || initialSource === 'manual'));
  const [showLink, setShowLink] = useState(false);
  const [link, setLink] = useState('');
  const [linkError, setLinkError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!group || !currentUser) return null;

  const isValid = supportedPositiveMoney(amount, state.currency) && title.trim().length > 0;
  const context: CaptureDraftContext = {source, receiptStatus, fileName};

  const handleReceipt = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setIsReading(true);
    try {
      const draft = await extractReceiptDraft(file);
      setSource('receipt');
      setReceiptStatus(draft.status);
      setFileName(draft.fileName);
      if (draft.status === 'needs_review') {
        setAmount(String(draft.amount));
        setTitle(draft.title);
      }
      setShowCorrection(true);
    } finally {
      setIsReading(false);
    }
  };

  const handleLink = (event: FormEvent) => {
    event.preventDefault();
    try {
      const url = new URL(link);
      if (!['http:', 'https:'].includes(url.protocol)) throw new Error('unsupported');
      setSource('receipt');
      setReceiptStatus('could_not_read');
      setFileName(`Receipt link · ${url.hostname}`);
      setTitle(copy.fixedReason ?? url.hostname.replace(/^www\./u, ''));
      setShowCorrection(true);
      setShowLink(false);
      setLinkError('');
    } catch {
      setLinkError('Enter a complete http or https receipt link.');
    }
  };

  return (
    <Screen>
      <ScreenHeader title={copy.addAction} onBack={onBack} />

      <ScreenContent className="px-6 py-7">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.txt,.csv,.json,text/plain,text/csv,application/json"
          className="sr-only"
          aria-label="Choose receipt"
          onChange={event => void handleReceipt(event)}
        />

        {!showCorrection ? (
          <div className="space-y-6">
            <div>
              <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Capture what happened</p>
              <h1 className="mt-2 text-3xl font-bold tracking-[-0.04em] text-gray-950 dark:text-white">
                {copy.id === 'spend_card' ? 'Match the receipt first' : 'Start with the receipt'}
              </h1>
              <p className="mt-2 max-w-sm text-sm leading-6 text-gray-600 dark:text-gray-300">
                We’ll pull out the total and place for you to review. Nothing is added yet.
              </p>
            </div>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isReading}
              aria-label="Add receipt"
              className="flex min-h-36 w-full flex-col items-center justify-center rounded-[1.75rem] border border-dashed border-gray-300 bg-white px-6 text-center transition-colors hover:border-gray-500 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:hover:border-gray-500"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#e6007a]/10 text-[#e6007a]">
                <Upload className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="mt-3 font-semibold text-gray-950 dark:text-white">{isReading ? 'Reading receipt…' : copy.addAction}</span>
              <span className="mt-1 text-xs text-gray-500 dark:text-gray-400">Photo or receipt file</span>
            </button>

            <button
              type="button"
              onClick={() => setShowLink(value => !value)}
              aria-expanded={showLink}
              className="flex w-full items-center justify-center gap-2 py-2 text-sm font-semibold text-gray-600 hover:text-gray-950 dark:text-gray-300 dark:hover:text-white"
            >
              <Link2 className="h-4 w-4" aria-hidden="true" />
              Paste a link
            </button>

            {showLink && (
              <form onSubmit={handleLink} className="space-y-2" aria-label="Receipt link">
                <label htmlFor="group-receipt-link" className="sr-only">Receipt link</label>
                <div className="flex gap-2">
                  <input
                    id="group-receipt-link"
                    type="url"
                    value={link}
                    onChange={event => {
                      setLink(event.target.value);
                      setLinkError('');
                    }}
                    placeholder="https://…"
                    className="min-h-12 min-w-0 flex-1 rounded-xl border border-gray-300 bg-white px-3 text-base text-gray-950 outline-none focus:border-[#e6007a] dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  />
                  <button type="submit" className="min-h-12 rounded-xl bg-gray-950 px-4 text-sm font-semibold text-white dark:bg-white dark:text-gray-950">Use link</button>
                </div>
                {linkError && <p role="alert" className="text-sm font-medium text-red-700 dark:text-red-300">{linkError}</p>}
              </form>
            )}

            <button
              type="button"
              onClick={() => {
                setSource('manual');
                setReceiptStatus(undefined);
                setFileName(undefined);
                setShowCorrection(true);
              }}
              className="flex w-full items-center justify-center gap-2 py-2 text-sm font-semibold text-gray-600 hover:text-gray-950 dark:text-gray-300 dark:hover:text-white"
            >
              <Keyboard className="h-4 w-4" aria-hidden="true" />
              Enter amount instead
            </button>
          </div>
        ) : (
        <div className="space-y-8">
          {source === 'receipt' && (
            <div
              role={receiptStatus === 'could_not_read' ? 'alert' : 'status'}
              className={`flex items-start gap-3 rounded-2xl px-4 py-3 text-sm ${receiptStatus === 'could_not_read' ? 'bg-amber-50 text-amber-900 dark:bg-amber-950/30 dark:text-amber-200' : 'bg-emerald-50 text-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200'}`}
            >
              <FileText className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <div className="min-w-0">
                <p className="font-semibold">
                  {receiptStatus === 'could_not_read' ? 'Couldn’t read the total' : 'Receipt added — review the details'}
                </p>
                <p className="mt-0.5 truncate opacity-80">{fileName}</p>
              </div>
            </div>
          )}
          <div>
            <label htmlFor="capture-amount" className="block text-sm font-medium text-gray-500 dark:text-gray-400">
              {copy.amountLabel}
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
              {copy.reasonLabel}
            </label>
            <input
              id="capture-title"
              type="text"
              placeholder={copy.reasonPlaceholder}
              value={title}
              onChange={event => setTitle(event.target.value)}
              readOnly={Boolean(copy.fixedReason)}
              className="mt-2 w-full border-b border-gray-300 bg-transparent py-3 text-xl font-medium text-gray-950 outline-none transition-colors placeholder:text-gray-300 focus:border-gray-950 dark:border-gray-700 dark:text-white dark:placeholder:text-gray-700 dark:focus:border-white"
            />
          </div>

          {copy.privacyNote && (
            <p className="rounded-2xl bg-white px-4 py-3 text-sm font-medium leading-5 text-gray-700 shadow-sm dark:bg-gray-900 dark:text-gray-200">{copy.privacyNote}</p>
          )}

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

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full text-center text-sm font-semibold text-gray-600 hover:text-gray-950 dark:text-gray-300 dark:hover:text-white"
          >
            Use a different receipt
          </button>
        </div>
        )}
      </ScreenContent>

      {showCorrection && <BottomAction>
        <Button
          fullWidth
          onClick={() => onNext(amount.trim(), title.trim(), context)}
          disabled={!isValid}
        >
          {copy.reviewTitle}
        </Button>
      </BottomAction>}
    </Screen>
  );
}

function supportedPositiveMoney(value: string, currency: string): boolean {
  try {
    return BigInt(moneyFromDecimal(value.trim(), currency, currency === 'PAS' ? 18 : 2).minorUnits) > 0n;
  } catch {
    return false;
  }
}
