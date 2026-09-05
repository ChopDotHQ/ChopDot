export function blockerSeverity(value) {
  const label = String(value);
  if (label === 'P0' || /^P0-[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(label)) return 3;
  if (label === 'P1' || /^P1-[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(label)) return 2;
  if (label === 'P2' || /^P2-[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(label)) return 1;
  return 0;
}

const statusRank = Object.freeze({ building: 3, ready: 2, blocked: 1, done: 0 });

export function rankProductCards(cards) {
  return [...cards].sort((left, right) =>
    (statusRank[right.status] ?? -1) - (statusRank[left.status] ?? -1)
    || blockerSeverity(right.blocker) - blockerSeverity(left.blocker)
    || Number(right.priority) - Number(left.priority)
    || String(left.id).localeCompare(String(right.id))
  );
}

export function nextBuildingProductCard(cards) {
  return rankProductCards(cards).find((card) => card.status === 'building') ?? null;
}
