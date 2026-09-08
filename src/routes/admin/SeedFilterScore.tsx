import type { FunctionReturnType } from "convex/server";
import type { api } from "@/convex/_generated/api";

export function SeedFilterScore({
  structures,
}: {
  structures: FunctionReturnType<typeof api.seedFilter.get>["structures"];
}) {
  const scored = structures.filter((structure) => structure.score !== null);
  return (
    <span
      className="font-mono"
      title={scored
        .map(
          (structure) =>
            `${structure.structureName.replace(/_/g, " ")}: ${structure.score}`
        )
        .join(" · ")}
    >
      {scored.length
        ? scored.map((structure) => structure.score).join(" / ")
        : "Not recorded"}
    </span>
  );
}
