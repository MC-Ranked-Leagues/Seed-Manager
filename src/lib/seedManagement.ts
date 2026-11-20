export const SEED_MODIFICATIONS_SESSION_KEY =
  "seed-manager.admin-seed-modifications-enabled";

export function clearSeedModificationSession() {
  sessionStorage.removeItem(SEED_MODIFICATIONS_SESSION_KEY);
}

type OrderedSeed = { _id: string; _creationTime: number; seedNumber?: number };

// client copy of the server's move-to-position, used for optimistic updates
export function moveSeedInList<T extends OrderedSeed>(
  seeds: T[],
  seedId: string,
  position: number
): T[] {
  const ordered = [...seeds].sort(
    (a, b) =>
      (a.seedNumber ?? Infinity) - (b.seedNumber ?? Infinity) ||
      a._creationTime - b._creationTime
  );
  const currentIndex = ordered.findIndex((seed) => seed._id === seedId);
  if (currentIndex === -1 || position < 1 || position > ordered.length) {
    return seeds;
  }
  const [moved] = ordered.splice(currentIndex, 1);
  ordered.splice(position - 1, 0, moved!);
  return ordered.map((seed, index) => ({ ...seed, seedNumber: index + 1 }));
}
