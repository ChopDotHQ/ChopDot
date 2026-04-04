/**
 * identityResolver - MVP stub (blockchain identity resolution removed)
 * 
 * In MVP, members are identified by name/email only.
 */

export function normalizeWalletAddress(address: string | null | undefined): string | null {
  return address ?? null;
}

export function resolveMemberIdentity(member: any): string {
  return member?.name ?? member?.email ?? member?.id ?? 'Unknown';
}

export function isValidAddress(_address: string): boolean {
  return false;
}

export function shortenAddress(address: string): string {
  if (!address) return '';
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function formatMemberIdentity(member: any): string {
  return member?.name ?? member?.email ?? shortenAddress(member?.address ?? '') ?? 'Unknown';
}
