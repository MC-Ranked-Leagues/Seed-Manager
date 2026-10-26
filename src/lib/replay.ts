// src/lib/replaySeeds.ts
import { unzipSync, strFromU8 } from "fflate";

export class InvalidReplayError extends Error {}

export function getReplayOverworldSeed(bytes: ArrayBuffer): string {
  try {
    const files = unzipSync(new Uint8Array(bytes), {
      filter: (f) => f.name === "meta.json",
    });
    if (!files["meta.json"]) throw new Error("no meta.json");
    const meta = JSON.parse(strFromU8(files["meta.json"]));
    const seed = meta.version >= 30 ? meta.overworldSeed : meta.seed;
    if (typeof seed !== "string") throw new Error("no seed");
    return seed;
  } catch {
    throw new InvalidReplayError("This isn't a valid replay file");
  }
}
