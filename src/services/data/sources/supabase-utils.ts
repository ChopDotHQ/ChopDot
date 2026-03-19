export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export function stripUndefined(input: Record<string, unknown>): Record<string, unknown> {
  return Object.entries(input).reduce<Record<string, unknown>>((acc, [key, value]) => {
    if (value !== undefined) {
      acc[key] = value;
    }
    return acc;
  }, {});
}

export function isRlsError(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false;
  return error.code === '42501' || /row-level security|row level security/i.test(error.message ?? '');
}

export function formatSupabaseError(
  error: { code?: string; message?: string; details?: string; hint?: string },
): string {
  const fragments = [
    error.code ? `code=${error.code}` : null,
    error.message ? `message="${error.message}"` : null,
    error.details ? `details="${error.details}"` : null,
    error.hint ? `hint="${error.hint}"` : null,
  ].filter(Boolean);
  return fragments.length > 0 ? `(${fragments.join(', ')})` : '(unknown Supabase error)';
}
