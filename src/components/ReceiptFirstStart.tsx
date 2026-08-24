import {ChangeEvent, FormEvent, useRef, useState} from 'react';
import {Camera, FileUp, Keyboard, Link2, ReceiptText} from 'lucide-react';
import {
  type CaptureSource,
  extractReceiptDraft,
  type ReceiptDraftStatus,
} from '../capture/receiptDraft';
import {readReceiptImageTextLocally} from '../capture/browserReceiptImageText';
import {moneyFromDecimal} from '../core/money';
import {getCurrencySymbol} from '../utils';
import {BottomAction, Button, Screen, ScreenContent, ScreenHeader} from './primitives';

export interface ReviewableReceiptDraft {
  amount: string;
  title: string;
  source: CaptureSource;
  receiptStatus?: ReceiptDraftStatus;
  fileName?: string;
}

interface ReceiptFirstStartProps {
  currency: string;
  onBack: () => void;
  onContinue: (draft: ReviewableReceiptDraft) => void;
}

export function ReceiptFirstStart({currency, onBack, onContinue}: ReceiptFirstStartProps) {
  const cameraInput = useRef<HTMLInputElement>(null);
  const importInput = useRef<HTMLInputElement>(null);
  const [amount, setAmount] = useState('');
  const [title, setTitle] = useState('');
  const [source, setSource] = useState<CaptureSource>('receipt');
  const [receiptStatus, setReceiptStatus] = useState<ReceiptDraftStatus>();
  const [fileName, setFileName] = useState<string>();
  const [showReview, setShowReview] = useState(false);
  const [showLink, setShowLink] = useState(false);
  const [link, setLink] = useState('');
  const [linkError, setLinkError] = useState('');
  const [isReading, setIsReading] = useState(false);
  const symbol = getCurrencySymbol(currency);
  const ready = supportedPositiveMoney(amount, currency) && title.trim().length > 0;

  const readReceipt = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setIsReading(true);
    setShowLink(false);
    try {
      const draft = await extractReceiptDraft(file, {readImageText: readReceiptImageTextLocally});
      setSource('receipt');
      setReceiptStatus(draft.status);
      setFileName(draft.fileName);
      if (draft.status === 'needs_review') {
        setAmount(String(draft.amount));
        setTitle(draft.title);
      }
      setShowReview(true);
    } finally {
      setIsReading(false);
    }
  };

  const captureLink = (event: FormEvent) => {
    event.preventDefault();
    try {
      const url = new URL(link);
      if (!['http:', 'https:'].includes(url.protocol)) throw new Error('unsupported');
      setSource('receipt');
      setReceiptStatus('could_not_read');
      setFileName(`Receipt link · ${url.hostname}`);
      setTitle(previous => previous || url.hostname.replace(/^www\./u, ''));
      setLinkError('');
      setShowReview(true);
    } catch {
      setLinkError('Enter a complete http or https receipt link.');
    }
  };

  const startManualCorrection = () => {
    setSource('manual');
    setReceiptStatus(undefined);
    setFileName(undefined);
    setShowLink(false);
    setShowReview(true);
  };

  return (
    <Screen>
      <ScreenHeader title="Scan a receipt" onBack={onBack} />
      <ScreenContent className="bg-[#f7f6f4] px-6 py-7 dark:bg-gray-950">
        <input
          ref={cameraInput}
          type="file"
          tabIndex={-1}
          accept="image/*"
          capture="environment"
          className="sr-only"
          aria-label="Take a receipt photo"
          onChange={event => void readReceipt(event)}
        />
        <input
          ref={importInput}
          type="file"
          tabIndex={-1}
          accept="image/*,.txt,.csv,.json,text/plain,text/csv,application/json"
          className="sr-only"
          aria-label="Import a receipt"
          onChange={event => void readReceipt(event)}
        />

        {!showReview ? (
          <div className="space-y-5">
            <div>
              <p className="text-sm font-semibold text-[#c40068] dark:text-[#ff65b5]">Catch what just happened</p>
              <h2 className="mt-2 text-[2.3rem] font-bold leading-[1.02] tracking-[-0.055em] text-gray-950 dark:text-white">
                Start with the receipt.
              </h2>
              <p className="mt-3 max-w-[19rem] text-[15px] leading-6 text-gray-600 dark:text-gray-300">
                You review the amount and people before anything is shared.
              </p>
            </div>

            <button
              type="button"
              onClick={() => cameraInput.current?.click()}
              disabled={isReading}
              data-primary-action="true"
              className="flex min-h-40 w-full flex-col items-center justify-center rounded-[1.8rem] bg-[#e6007a] px-6 text-center text-white shadow-[0_16px_34px_rgba(230,0,122,0.24)] transition-colors hover:bg-[#c9006b] disabled:opacity-60"
            >
              <Camera className="h-8 w-8" aria-hidden="true" />
              <span className="mt-3 text-lg font-bold">{isReading ? 'Reading receipt…' : 'Take a photo'}</span>
              <span className="mt-1 text-sm text-white/80">Nothing is added yet</span>
            </button>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => importInput.current?.click()}
                className="flex min-h-14 items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-900 shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:text-white"
              >
                <FileUp className="h-4 w-4 text-[#e6007a]" aria-hidden="true" />
                Import
              </button>
              <button
                type="button"
                onClick={() => setShowLink(value => !value)}
                aria-expanded={showLink}
                className="flex min-h-14 items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-900 shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:text-white"
              >
                <Link2 className="h-4 w-4 text-[#e6007a]" aria-hidden="true" />
                Add link
              </button>
            </div>

            {showLink && (
              <form onSubmit={captureLink} className="space-y-2" aria-label="Receipt link">
                <label htmlFor="receipt-link" className="text-sm font-semibold text-gray-700 dark:text-gray-200">Receipt or payment link</label>
                <div className="flex gap-2">
                  <input
                    id="receipt-link"
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
              onClick={startManualCorrection}
              className="flex min-h-11 w-full items-center justify-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-950 dark:text-gray-300 dark:hover:text-white"
            >
              <Keyboard className="h-4 w-4" aria-hidden="true" />
              Enter an amount instead
            </button>
          </div>
        ) : (
          <div className="space-y-7">
            <div>
              <p className="text-sm font-semibold text-[#c40068] dark:text-[#ff65b5]">Local draft</p>
              <h2 className="mt-2 text-3xl font-bold tracking-[-0.045em] text-gray-950 dark:text-white">Review what we caught</h2>
              <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">Nothing is shared or counted until you choose a group and save.</p>
            </div>

            {source === 'receipt' && (
              <div
                role={receiptStatus === 'could_not_read' ? 'alert' : 'status'}
                className={`flex items-start gap-3 rounded-2xl px-4 py-3 text-sm ${receiptStatus === 'could_not_read' ? 'bg-amber-50 text-amber-950 dark:bg-amber-950/40 dark:text-amber-100' : 'bg-emerald-50 text-emerald-950 dark:bg-emerald-950/40 dark:text-emerald-100'}`}
              >
                <ReceiptText className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="font-semibold">{receiptStatus === 'could_not_read' ? 'Please enter the total' : 'Receipt added — check the details'}</p>
                  {fileName && <p className="mt-0.5 truncate opacity-75">{fileName}</p>}
                </div>
              </div>
            )}

            <div>
              <label htmlFor="quick-receipt-amount" className="block text-sm font-semibold text-gray-600 dark:text-gray-300">Total</label>
              <div className="mt-2 flex items-baseline border-b-2 border-gray-300 pb-3 focus-within:border-[#e6007a] dark:border-gray-700">
                <span className="mr-2 text-3xl text-gray-400">{symbol}</span>
                <input
                  id="quick-receipt-amount"
                  inputMode="decimal"
                  value={amount}
                  onChange={event => setAmount(event.target.value)}
                  placeholder="0.00"
                  className="min-w-0 flex-1 bg-transparent text-5xl font-bold tracking-[-0.05em] text-gray-950 outline-none placeholder:text-gray-300 dark:text-white dark:placeholder:text-gray-700"
                />
              </div>
            </div>

            <div>
              <label htmlFor="quick-receipt-title" className="block text-sm font-semibold text-gray-600 dark:text-gray-300">Merchant or reason</label>
              <input
                id="quick-receipt-title"
                value={title}
                onChange={event => setTitle(event.target.value)}
                placeholder="e.g. Dinner at Gusto"
                className="mt-2 min-h-12 w-full border-b-2 border-gray-300 bg-transparent text-xl font-semibold text-gray-950 outline-none focus:border-[#e6007a] dark:border-gray-700 dark:text-white"
              />
            </div>

            <button type="button" onClick={() => setShowReview(false)} className="w-full py-2 text-sm font-semibold text-gray-600 dark:text-gray-300">
              Use another receipt
            </button>
          </div>
        )}
      </ScreenContent>

      {showReview && (
        <BottomAction>
          <Button
            fullWidth
            disabled={!ready}
            onClick={() => onContinue({
              amount: amount.trim(),
              title: title.trim(),
              source,
              receiptStatus,
              fileName,
            })}
          >
            Continue with this draft
          </Button>
        </BottomAction>
      )}
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
