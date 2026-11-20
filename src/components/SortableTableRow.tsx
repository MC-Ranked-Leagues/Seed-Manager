import type { ComponentProps } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { TableCell, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

// a table row whose first cell is the drag handle; use inside SortableSeedRows
export function SortableTableRow({
  id,
  disabled = false,
  handleLabel,
  className,
  style,
  children,
  ...props
}: ComponentProps<"tr"> & {
  id: string;
  disabled?: boolean;
  handleLabel: string;
}) {
  const {
    attributes,
    isDragging,
    listeners,
    setActivatorNodeRef,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id, disabled });

  return (
    <TableRow
      ref={setNodeRef}
      className={cn(
        isDragging && "relative z-1 bg-muted shadow-sm hover:bg-muted",
        className
      )}
      style={{
        ...style,
        transform: CSS.Translate.toString(transform),
        transition,
      }}
      {...props}
    >
      <TableCell className="w-8 px-1">
        <button
          ref={setActivatorNodeRef}
          aria-label={handleLabel}
          className="flex size-6 cursor-grab touch-none items-center justify-center rounded-sm text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-40"
          disabled={disabled}
          onClick={(event) => event.stopPropagation()}
          type="button"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-4" />
        </button>
      </TableCell>
      {children}
    </TableRow>
  );
}
