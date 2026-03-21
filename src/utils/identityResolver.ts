export type IdentitySource = {
  id?: string | null;
  name?: string | null;
  address?: string | null;
  paymentPreference?: string | null;
};

export type ResolvedIdentity = {
  id?: string;
  name?: string;
  address?: string;
  paymentPreference: string;
  matchedBy: "id" | "name" | "none";
};

const normalizeText = (value?: string | null): string | undefined => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

export const normalizeWalletAddress = (
  address?: string | null,
): string | undefined => normalizeText(address);

export const resolvePaymentPreference = (
  address?: string | null,
  preferred?: string | null,
  fallback: string = "Any method",
): string => {
  if (normalizeWalletAddress(address)) return "DOT";
  return normalizeText(preferred) || fallback;
};

export const resolveMemberIdentity = ({
  targetId,
  targetName,
  sources,
  fallbackPreference = "Any method",
}: {
  targetId?: string | null;
  targetName?: string | null;
  sources: IdentitySource[];
  fallbackPreference?: string;
}): ResolvedIdentity => {
  const normalizedTargetId = normalizeText(targetId);
  const normalizedTargetName = normalizeText(targetName);
  const normalizedTargetNameLower = normalizedTargetName?.toLowerCase();

  const byId = normalizedTargetId
    ? sources.find((source) => normalizeText(source.id) === normalizedTargetId)
    : undefined;
  const byName = normalizedTargetNameLower
    ? sources.find(
        (source) => normalizeText(source.name)?.toLowerCase() === normalizedTargetNameLower,
      )
    : undefined;

  const candidates: IdentitySource[] = [];
  const pushCandidate = (candidate?: IdentitySource) => {
    if (!candidate) return;
    if (!candidates.includes(candidate)) {
      candidates.push(candidate);
    }
  };
  pushCandidate(byId);
  pushCandidate(byName);
  if (candidates.length === 0 && !normalizedTargetId && !normalizedTargetName && sources.length === 1) {
    pushCandidate(sources[0]);
  }

  const resolvedAddress = candidates
    .map((candidate) => normalizeWalletAddress(candidate.address))
    .find((value): value is string => !!value);

  const resolvedId =
    normalizeText(byId?.id) ||
    normalizeText(byName?.id) ||
    normalizedTargetId ||
    normalizeText(candidates[0]?.id);

  const resolvedName =
    normalizeText(byId?.name) ||
    normalizeText(byName?.name) ||
    normalizedTargetName ||
    normalizeText(candidates[0]?.name) ||
    resolvedId;

  const preferred = normalizeText(byId?.paymentPreference) ||
    normalizeText(byName?.paymentPreference) ||
    normalizeText(candidates[0]?.paymentPreference);

  return {
    id: resolvedId,
    name: resolvedName,
    address: resolvedAddress,
    paymentPreference: resolvePaymentPreference(
      resolvedAddress,
      preferred,
      fallbackPreference,
    ),
    matchedBy: byId ? "id" : byName ? "name" : "none",
  };
};
