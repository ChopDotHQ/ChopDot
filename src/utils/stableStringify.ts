/**
 * Stable Stringify Utility
 * 
 * Provides deterministic JSON stringification by sorting object keys recursively.
 * Ensures the same logical object always produces the same JSON string,
 * regardless of key insertion order.
 */

export function stableStringify(input: any): string {
  const seen = new WeakSet();

  const sort = (val: any): any => {
    if (val === null || typeof val !== 'object') return val;
    if (seen.has(val)) return null; // cycle guard
    seen.add(val);

    if (Array.isArray(val)) return val.map(sort);

    // Sort keys at every depth
    return Object.keys(val).sort().reduce((acc: any, k) => {
      acc[k] = sort(val[k]);
      return acc;
    }, {});
  };

  return JSON.stringify(sort(input));
}

