/**
 * Formats a timestamp into a human-readable relative time string.
 * Returns "Just now", "5m ago", "2h ago", "3d ago", or a formatted date.
 */
export function formatRelativeTime(timestamp: string | Date, now: Date = new Date()): string {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  const diffInMs = now.getTime() - date.getTime();
  const diffInMins = Math.floor(diffInMs / 60_000);
  const diffInHours = Math.floor(diffInMs / 3_600_000);
  const diffInDays = Math.floor(diffInMs / 86_400_000);

  if (diffInMins < 1) return 'Just now';
  if (diffInMins < 60) return `${diffInMins}m ago`;
  if (diffInHours < 24) return `${diffInHours}h ago`;
  if (diffInDays < 7) return `${diffInDays}d ago`;

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}
