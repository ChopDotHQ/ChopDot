import QRCodeLib from 'qrcode';

export type CaptureLinkPath = 'spend' | 'pay' | 'confirm';

export function encodeCaptureUrl(path: CaptureLinkPath, token: string, origin?: string): string {
  const base = origin ?? (typeof window !== 'undefined' ? window.location.origin : 'https://app.chopdot.xyz');
  return `${base}/${path}?t=${encodeURIComponent(token)}`;
}

export async function encodeCaptureQrDataUrl(
  path: CaptureLinkPath,
  token: string,
  origin?: string,
): Promise<string> {
  const url = encodeCaptureUrl(path, token, origin);
  return QRCodeLib.toDataURL(url, {
    width: 300,
    margin: 2,
    errorCorrectionLevel: 'M',
    color: {
      dark: '#000000',
      light: '#FFFFFF',
    },
  });
}

export function buildPayShareText(input: {
  amount: number;
  currency: string;
  counterpartyName: string;
  url: string;
}): string {
  return `Your share: ${input.amount.toFixed(2)} ${input.currency} — tap to pay ${input.counterpartyName}:\n${input.url}`;
}

export function buildConfirmShareText(input: {
  payerName: string;
  amount: number;
  currency: string;
  url: string;
}): string {
  return `${input.payerName} marked ${input.amount.toFixed(2)} ${input.currency} sent — tap to confirm you received it:\n${input.url}`;
}
