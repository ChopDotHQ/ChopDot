import type { PaymentEvidenceRef, ReceiptCaptureItem } from '../../chapter/types';

export type ReceiptScanItem = {
  label: string;
  amount: number;
};

export type ReceiptScanResult = {
  merchantName: string;
  total?: number;
  date?: string;
  items: ReceiptScanItem[];
  rawText: string;
  confidence: 'high' | 'medium' | 'low';
};

const TOTAL_WORDS = /\b(total|amount due|balance|grand total|summe|betrag|gesamt)\b/i;
const NON_ITEM_WORDS = /\b(total|subtotal|tax|vat|mwst|tip|change|cash|card|visa|mastercard|balance|amount due)\b/i;
const DATE_PATTERN = /\b(\d{1,2}[./-]\d{1,2}[./-]\d{2,4}|\d{4}[./-]\d{1,2}[./-]\d{1,2})\b/;
const MONEY_PATTERN = /(?:CHF|USD|EUR|GBP|\$|€|£)?\s*(-?\d{1,4}(?:[.,]\d{2}))\b/i;

function cleanLine(line: string): string {
  return line.replace(/\s+/g, ' ').replace(/[|]+/g, '').trim();
}

function parseMoney(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const normalized = value.replace(/[^\d,.-]/g, '').replace(',', '.');
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
  return Math.round(parsed * 100) / 100;
}

function extractAmount(line: string): number | undefined {
  const matches = Array.from(line.matchAll(new RegExp(MONEY_PATTERN, 'gi')));
  const last = matches.at(-1);
  return parseMoney(last?.[1]);
}

function stripAmount(line: string): string {
  return line.replace(new RegExp(MONEY_PATTERN, 'gi'), '').replace(/\s{2,}/g, ' ').trim();
}

function looksLikeMerchant(line: string): boolean {
  if (!line || line.length < 2) return false;
  if (DATE_PATTERN.test(line)) return false;
  if (MONEY_PATTERN.test(line)) return false;
  if (TOTAL_WORDS.test(line)) return false;
  return /[a-zA-Z]/.test(line);
}

export function parseReceiptText(rawText: string): ReceiptScanResult {
  const lines = rawText
    .split(/\r?\n/)
    .map(cleanLine)
    .filter(Boolean);

  const merchantName = lines.find(looksLikeMerchant) ?? 'Receipt';
  const date = lines.find((line) => DATE_PATTERN.test(line))?.match(DATE_PATTERN)?.[1];
  const totalCandidates = lines
    .filter((line) => TOTAL_WORDS.test(line))
    .map(extractAmount)
    .filter((amount): amount is number => typeof amount === 'number');
  const itemCandidates = lines
    .filter((line) => MONEY_PATTERN.test(line) && !NON_ITEM_WORDS.test(line))
    .map((line) => {
      const amount = extractAmount(line);
      const label = stripAmount(line).replace(/^[\W\d]+/, '').trim();
      if (!amount || !label || label.length < 2) return null;
      return { label, amount };
    })
    .filter((item): item is ReceiptScanItem => Boolean(item));

  const itemTotal = itemCandidates.reduce((sum, item) => sum + item.amount, 0);
  const maxLineAmount = lines
    .map(extractAmount)
    .filter((amount): amount is number => typeof amount === 'number')
    .reduce((max, amount) => Math.max(max, amount), 0);
  const total = totalCandidates.at(-1) ?? (itemTotal > 0 ? Math.round(itemTotal * 100) / 100 : maxLineAmount || undefined);

  const confidence =
    merchantName !== 'Receipt' && total && itemCandidates.length > 0
      ? 'high'
      : merchantName !== 'Receipt' && total
        ? 'medium'
        : 'low';

  return {
    merchantName,
    total,
    date,
    items: itemCandidates,
    rawText,
    confidence,
  };
}

export function receiptScanToPaymentRef(scan: ReceiptScanResult, currency: string): PaymentEvidenceRef {
  const capturedAt = new Date().toISOString();
  return {
    id: `receipt_${capturedAt.replace(/\D/g, '').slice(0, 14)}_${Math.random().toString(36).slice(2, 7)}`,
    kind: 'receipt',
    source: 'manual_checkout',
    status: 'observed',
    capturedAt,
    display: scan.total ? `${scan.merchantName} · ${scan.total.toFixed(2)} ${currency}` : `${scan.merchantName} receipt`,
    rawHash: `receipt_text_${hashText(scan.rawText)}`,
    amount: scan.total,
    currency,
    merchantName: scan.merchantName,
    receiptId: scan.date ? `${scan.merchantName}-${scan.date}` : undefined,
  };
}

export function receiptScanToItems(
  scan: ReceiptScanResult,
  assignedMemberIds: string[],
): ReceiptCaptureItem[] {
  const members = assignedMemberIds.length ? assignedMemberIds : [];
  if (scan.items.length) {
    return scan.items.map((item, index) => ({
      id: `receipt_item_${Date.now()}_${index}`,
      label: item.label,
      amount: item.amount,
      assignedMemberIds: members,
    }));
  }
  if (scan.total) {
    return [
      {
        id: `receipt_item_${Date.now()}_total`,
        label: `${scan.merchantName} receipt`,
        amount: scan.total,
        assignedMemberIds: members,
      },
    ];
  }
  return [];
}

function hashText(input: string): string {
  let hash = 5381;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 33) ^ input.charCodeAt(index);
  }
  return (hash >>> 0).toString(16);
}

async function readTextFromFile(file: File): Promise<string> {
  if (file.type.startsWith('text/') || file.name.toLowerCase().endsWith('.txt')) {
    return file.text();
  }

  if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
    throw new Error('PDF receipt reading is not ready yet. Import a photo or paste the payment link.');
  }

  if (!file.type.startsWith('image/')) {
    throw new Error('Use a receipt photo, image, or payment link.');
  }

  const tesseract = await import('tesseract.js');
  const result = await tesseract.recognize(file, 'eng');
  return result.data.text;
}

export class ReceiptScannerService {
  async scanFile(file: File): Promise<ReceiptScanResult> {
    const rawText = await readTextFromFile(file);
    const scan = parseReceiptText(rawText);
    if (scan.confidence === 'low') {
      throw new Error('Could not read the receipt. Try a clearer photo or paste the payment link.');
    }
    return scan;
  }
}

export const receiptScannerService = new ReceiptScannerService();
