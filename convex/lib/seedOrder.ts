import { ConvexError } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

export function compareSeedOrder(a: Doc<"seeds">, b: Doc<"seeds">) {
  if (a.seedNumber !== undefined && b.seedNumber !== undefined) {
    return a.seedNumber - b.seedNumber || a._creationTime - b._creationTime;
  }
  if (a.seedNumber !== undefined) return -1;
  if (b.seedNumber !== undefined) return 1;
  return a._creationTime - b._creationTime;
}

// moves a seed to a 1-based position in an already sorted group and
// renumbers every seed whose number changed
export async function moveSeedToPosition(
  ctx: MutationCtx,
  group: Doc<"seeds">[],
  seedId: Id<"seeds">,
  position: number
) {
  const currentIndex = group.findIndex((item) => item._id === seedId);
  const nextIndex = position - 1;
  if (
    currentIndex === -1 ||
    !Number.isSafeInteger(position) ||
    nextIndex < 0 ||
    nextIndex >= group.length
  ) {
    throw new ConvexError({
      code: "INVALID_POSITION",
      message: "The requested position is outside this seed list",
    });
  }
  if (currentIndex === nextIndex) return null;

  const ordered = [...group];
  const [moved] = ordered.splice(currentIndex, 1);
  ordered.splice(nextIndex, 0, moved!);
  for (const [index, item] of ordered.entries()) {
    const seedNumber = index + 1;
    if (item.seedNumber !== seedNumber) {
      await ctx.db.patch("seeds", item._id, { seedNumber });
    }
  }

  return { from: currentIndex + 1, to: nextIndex + 1 };
}
