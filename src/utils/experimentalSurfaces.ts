export function experimentalPotSurfacesEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  return (
    params.get('chopdot-experimental') === '1' ||
    params.get('chopdot-dot-native') === '1' ||
    params.get('chopdot-dot-lab') === '1' ||
    params.get('chopdot-dot-dev') === '1'
  );
}
