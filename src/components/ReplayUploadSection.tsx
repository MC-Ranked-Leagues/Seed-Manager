import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";

export function ReplayUploadSection({
  title,
  count,
  tone,
  children,
}: {
  title: string;
  count: number;
  tone?: "warning" | "error";
  children: ReactNode;
}) {
  if (count === 0) return null;

  return (
    <section className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-medium">{title}</h3>
        <Badge
          variant={
            tone === "error"
              ? "destructive"
              : tone === "warning"
                ? "outline"
                : "secondary"
          }
        >
          {count}
        </Badge>
      </div>
      <ul className="flex flex-col gap-1 text-xs">{children}</ul>
    </section>
  );
}
