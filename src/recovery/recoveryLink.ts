export const RECOVERY_LINK_PARAM = 'chopdot-recover';

export function recoveryUrl(baseUrl: string, groupId: string): string {
  assertGroupId(groupId);
  const url = new URL(baseUrl);
  url.hash = `${RECOVERY_LINK_PARAM}=${encodeURIComponent(groupId)}`;
  return url.toString();
}

export function recoveryGroupFromUrl(value: string): string {
  const url = new URL(value);
  const fragment = url.hash.slice(1);
  const params = new URLSearchParams(fragment);
  if ([...params.keys()].length !== 1 || !params.has(RECOVERY_LINK_PARAM)) throw new Error('Recovery route is invalid.');
  const values = params.getAll(RECOVERY_LINK_PARAM);
  if (values.length !== 1) throw new Error('Recovery route is invalid.');
  const groupId = values[0];
  assertGroupId(groupId);
  return groupId;
}

function assertGroupId(value: string): void {
  if (!/^[a-z0-9][a-z0-9_-]{0,127}$/iu.test(value)) throw new Error('Recovery group is invalid.');
}
