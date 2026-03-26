export type RequestPaymentBreakdown = {
  potName: string;
  amount: number;
  currency?: string;
};

export type RequestPaymentPerson = {
  id: string;
  name: string;
  totalAmount: number;
  breakdown: RequestPaymentBreakdown[];
  paymentPreference?: string;
};

const DOT_PRECISION = 6;

export const inferRequestCurrency = (
  person: Pick<RequestPaymentPerson, 'breakdown'>,
): string | null => {
  const currencies = new Set(
    person.breakdown
      .map((item) => item.currency?.trim())
      .filter((currency): currency is string => Boolean(currency)),
  );
  if (currencies.size === 1) {
    return Array.from(currencies)[0] ?? null;
  }
  return null;
};

export const formatRequestAmount = (
  amount: number,
  currency?: string | null,
): string => {
  if (currency === 'DOT') {
    return `${amount.toFixed(DOT_PRECISION)} DOT`;
  }
  if (currency === 'USDC') {
    return `${amount.toFixed(2)} USDC`;
  }
  if (currency && currency !== 'USD') {
    return `${amount.toFixed(2)} ${currency}`;
  }
  return `$${amount.toFixed(2)}`;
};

export const buildPaymentRequestText = (
  person: RequestPaymentPerson,
  message: string,
): string => {
  const lines: string[] = ['Payment request from ChopDot', `For: ${person.name}`];
  const displayCurrency = inferRequestCurrency(person);
  if (displayCurrency) {
    lines.push(`Amount: ${formatRequestAmount(person.totalAmount, displayCurrency)}`);
  } else if (person.breakdown.length > 0) {
    lines.push('Amount: See pot breakdown below');
  } else {
    lines.push(`Amount: ${formatRequestAmount(person.totalAmount)}`);
  }

  if (person.breakdown.length > 0) {
    const breakdown = person.breakdown
      .map((item) => `${item.potName} (${formatRequestAmount(item.amount, item.currency)})`)
      .join(', ');
    lines.push(`Pots: ${breakdown}`);
  }

  const trimmed = message.trim();
  if (trimmed.length > 0) {
    lines.push(`Message: ${trimmed}`);
  }

  return lines.join('\n');
};

export const buildPaymentRequestNotificationMessage = (
  person: RequestPaymentPerson,
  message: string,
  deliveryMethod?: string | null,
): string => {
  const trimmed = message.trim();
  if (trimmed.length > 0) {
    return trimmed;
  }

  const displayCurrency = inferRequestCurrency(person);
  const deliverySuffix =
    deliveryMethod && deliveryMethod !== 'in-app'
      ? ` via ${deliveryMethod}`
      : '';

  if (displayCurrency) {
    return `Requested ${formatRequestAmount(person.totalAmount, displayCurrency)} from ${person.name}${deliverySuffix}`;
  }

  if (person.breakdown.length > 0) {
    const breakdown = person.breakdown
      .map((item) => `${item.potName} (${formatRequestAmount(item.amount, item.currency)})`)
      .join(', ');
    return `Requested payment from ${person.name}${deliverySuffix}: ${breakdown}`;
  }

  return `Requested payment from ${person.name}${deliverySuffix}`;
};
