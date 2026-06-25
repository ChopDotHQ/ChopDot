import type { ParsedExpenseDraft } from './types';

const AMOUNT_PATTERNS = [
  /(?:I paid|paid)\s*[€$£CHF]?\s*(\d+(?:[.,]\d+)?)\s*(.*)?$/i,
  /[€$£]\s*(\d+(?:[.,]\d+)?)\s*(?:for|on|at)?\s*(.*)?$/i,
  /(\d+(?:[.,]\d+)?)\s*(?:EUR|USD|CHF|GBP)\b\s*(.*)?$/i,
];

const SPLIT_PATTERN = /split\s+(\d+)\s*(?:ways?|people|ways)?/i;

function parseAmount(raw: string): number {
  const normalized = raw.replace(',', '.');
  const value = Number.parseFloat(normalized);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error('Invalid amount');
  }
  return value;
}

export function parseExpenseMessage(text: string): ParsedExpenseDraft | null {
  const trimmed = text.trim();
  if (trimmed.length < 3) {
    return null;
  }

  for (const pattern of AMOUNT_PATTERNS) {
    const match = trimmed.match(pattern);
    if (!match?.[1]) {
      continue;
    }

    const amount = parseAmount(match[1]);
    let memo = (match[2] ?? '').trim();
    let splitCount: number | undefined;

    const splitMatch = memo.match(SPLIT_PATTERN);
    if (splitMatch?.[1]) {
      splitCount = Number.parseInt(splitMatch[1], 10);
      memo = memo.replace(SPLIT_PATTERN, '').trim();
    }

    if (!memo) {
      memo = 'Expense';
    }

    return { amount, memo, splitCount };
  }

  return null;
}
