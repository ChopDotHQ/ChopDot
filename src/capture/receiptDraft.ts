export type ReceiptDraftStatus = 'needs_review' | 'could_not_read';
export type CaptureSource = 'receipt' | 'manual';

export interface CaptureDraftContext {
  source: CaptureSource;
  receiptStatus?: ReceiptDraftStatus;
  fileName?: string;
}

export type ReceiptDraft =
  | {
      status: 'needs_review';
      amount: number;
      title: string;
      fileName: string;
    }
  | {
      status: 'could_not_read';
      reason: 'unsupported_file' | 'empty_file' | 'missing_total';
      fileName: string;
    };

export interface ReceiptFile {
  name: string;
  type: string;
  text: () => Promise<string>;
}

const supportedTextTypes = new Set([
  'text/plain',
  'text/csv',
  'application/json',
]);

const supportedTextExtensions = ['.txt', '.csv', '.json'];

export async function extractReceiptDraft(file: ReceiptFile): Promise<ReceiptDraft> {
  if (!isSupportedTextReceipt(file)) {
    return {
      status: 'could_not_read',
      reason: 'unsupported_file',
      fileName: file.name,
    };
  }

  const text = await file.text();
  if (!text.trim()) {
    return {
      status: 'could_not_read',
      reason: 'empty_file',
      fileName: file.name,
    };
  }

  const amount = extractTotal(text);
  if (amount === null) {
    return {
      status: 'could_not_read',
      reason: 'missing_total',
      fileName: file.name,
    };
  }

  return {
    status: 'needs_review',
    amount,
    title: extractMerchant(text),
    fileName: file.name,
  };
}

function isSupportedTextReceipt(file: ReceiptFile) {
  const lowerName = file.name.toLowerCase();
  return supportedTextTypes.has(file.type) || supportedTextExtensions.some(extension => lowerName.endsWith(extension));
}

function extractTotal(text: string): number | null {
  const totalPattern = /(?:grand\s+total|amount\s+due|total)\s*[:\-]?\s*(?:(?:chf|usd|eur|gbp|\$|€|£)\s*)?([0-9][0-9'.,]*)/gi;
  const matches = [...text.matchAll(totalPattern)];

  for (const match of matches.reverse()) {
    const amount = parseReceiptNumber(match[1]);
    if (amount !== null && amount > 0) return amount;
  }

  return null;
}

function parseReceiptNumber(value: string): number | null {
  const compact = value.replace(/[\s']/g, '');
  const lastComma = compact.lastIndexOf(',');
  const lastDot = compact.lastIndexOf('.');
  let normalized = compact;

  if (lastComma > lastDot) {
    normalized = compact.replace(/\./g, '').replace(',', '.');
  } else if (lastDot >= 0) {
    normalized = compact.replace(/,/g, '');
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function extractMerchant(text: string): string {
  const candidate = text
    .split(/\r?\n/)
    .map(line => line.trim())
    .find(line => {
      if (!line || line.length > 80) return false;
      if (/^(receipt|invoice|date|time|total|grand\s+total|amount\s+due)\b/i.test(line)) return false;
      return /[a-z]/i.test(line);
    });

  return candidate ?? 'Receipt';
}
