import type { ReactNode } from "react";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  restrictToFirstScrollableAncestor,
  restrictToVerticalAxis,
} from "@dnd-kit/modifiers";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

// wraps a table whose rows are SortableTableRows. onMove gets a 1-based position
export function SortableSeedRows<Id extends string>({
  ids,
  onMove,
  children,
}: {
  ids: Id[];
  onMove: (id: Id, position: number) => void;
  children: ReactNode;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const position = ids.indexOf(over.id as Id) + 1;
    if (position > 0) onMove(active.id as Id, position);
  };

  return (
    <DndContext
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis, restrictToFirstScrollableAncestor]}
      onDragEnd={handleDragEnd}
      sensors={sensors}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        {children}
      </SortableContext>
    </DndContext>
  );
}
