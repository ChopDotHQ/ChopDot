export function getCurrencySymbol(code: string): string {
  switch (code) {
    case 'CHF': return 'CHF ';
    case 'EUR': return '€';
    case 'GBP': return '£';
    case 'USD': return '$';
    case 'PAS': return 'PAS ';
    default: return '$';
  }
}

export function formatMoney(amount: number, currency: string = 'USD'): string {
  const sym = getCurrencySymbol(currency);
  return `${sym}${amount.toFixed(2)}`;
}

export function getInitials(name: string): string {
  if (!name) return '';
  const parts = name.trim().split(' ').filter(p => p.length > 0);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
