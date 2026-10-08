"use client";

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import { rectSortingStrategy, SortableContext, sortableKeyboardCoordinates, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import type { Layout } from "@/lib/layout";
import { positionForMove } from "@/lib/position";
import type { Colors, School, Status } from "@/lib/types";
import { cardSpring } from "./motion";
import { Tile } from "./Tile";

type GridProps = {
  schools: School[];
  colors: Colors;
  L: Layout;
  logoUrl: (s: School) => string | null;
  showNames: boolean;
  shimmer: boolean;
  reduced: boolean;
  editAll: boolean;
  openId: string | null;
  addOpen: boolean;
  onOpen: (id: string) => void;
  onAdd: () => void;
  /** Hover/focus anywhere on a tile's column (tile + dots) targets it for keys 1–6. */
  onHover: (id: string, on: boolean) => void;
  onStatus: (id: string, status: Status) => void;
  onRemove: (id: string) => void;
  onMove: (id: string, position: number) => void;
};

export function Grid(props: GridProps) {
  const { schools, L, editAll, onMove } = props;
  const [dragId, setDragId] = useState<UniqueIdentifier | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const name = (id: UniqueIdentifier) => schools.find((s) => s.id === id)?.name ?? "school";

  const onDragStart = (e: DragStartEvent) => setDragId(e.active.id);
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    setDragId(null);
    if (!over || active.id === over.id) return;
    const from = schools.findIndex((s) => s.id === active.id);
    const to = schools.findIndex((s) => s.id === over.id);
    if (from < 0 || to < 0) return;
    onMove(String(active.id), positionForMove(schools.map((s) => s.position), from, to));
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setDragId(null)}
      accessibility={{
        announcements: {
          onDragStart: ({ active }) => `Picked up ${name(active.id)}.`,
          onDragOver: ({ active, over }) => (over ? `${name(active.id)} is over ${name(over.id)}.` : `${name(active.id)} is no longer over a school.`),
          onDragEnd: ({ active, over }) => (over ? `${name(active.id)} was moved to ${name(over.id)}'s spot.` : `${name(active.id)} was dropped.`),
          onDragCancel: ({ active }) => `Reordering cancelled. ${name(active.id)} was dropped.`,
        },
        screenReaderInstructions: {
          draggable: "To reorder, press space or enter on the handle, use the arrow keys to move, then space or enter to drop. Escape cancels.",
        },
      }}
    >
      <SortableContext items={schools.map((s) => s.id)} strategy={rectSortingStrategy} disabled={!editAll}>
        <ul
          aria-label="Schools"
          style={{
            listStyle: "none",
            margin: 0,
            padding: 0,
            display: "grid",
            // Never more columns than tiles, so short lists stay centered.
            gridTemplateColumns: `repeat(${Math.max(1, Math.min(L.cols, schools.length + (editAll ? 1 : 0)))}, ${L.tile}px)`,
            justifyContent: "center",
            alignItems: "start",
            columnGap: L.gap,
            rowGap: L.rowGap,
          }}
        >
          {schools.map((s) => (
            <SortableTile key={s.id} school={s} dragging={dragId === s.id} {...props} />
          ))}
          {editAll && (
            <li style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <AddTile L={L} hidden={props.addOpen} reduced={props.reduced} onClick={props.onAdd} label="Add school" />
            </li>
          )}
        </ul>
      </SortableContext>
    </DndContext>
  );
}

function SortableTile({ school, dragging, ...p }: GridProps & { school: School; dragging: boolean }) {
  const { setNodeRef, setActivatorNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({
    id: school.id,
    disabled: !p.editAll,
  });

  return (
    <li
      ref={setNodeRef}
      data-tile={school.id}
      onPointerEnter={() => p.onHover(school.id, true)}
      onPointerLeave={() => p.onHover(school.id, false)}
      onFocus={() => p.onHover(school.id, true)}
      onBlur={() => p.onHover(school.id, false)}
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        transform: CSS.Translate.toString(transform),
        transition,
        zIndex: isDragging ? 40 : undefined,
        scale: isDragging ? 1.06 : 1,
        touchAction: p.editAll ? "manipulation" : undefined,
      }}
    >
      <Tile
        school={school}
        colors={p.colors}
        L={p.L}
        logoUrl={p.logoUrl(school)}
        showNames={p.showNames}
        shimmer={p.shimmer}
        reduced={p.reduced}
        editAll={p.editAll}
        isOpen={p.openId === school.id}
        isDragging={dragging || isDragging}
        onOpen={() => p.onOpen(school.id)}
        onStatus={(status) => p.onStatus(school.id, status)}
        onRemove={() => p.onRemove(school.id)}
        handle={
          <button
            type="button"
            ref={setActivatorNodeRef}
            {...attributes}
            {...listeners}
            aria-label={`Drag to reorder ${school.name}`}
            title="Drag to reorder"
            className="absolute -top-2 -left-2 z-[4] flex size-7 cursor-grab items-center justify-center rounded-full border border-white/18 bg-[rgba(22,20,18,0.86)] text-white active:cursor-grabbing"
            style={{ touchAction: "none" }}
          >
            <GripVertical size={14} aria-hidden />
          </button>
        }
      />
    </li>
  );
}

export function AddTile({
  L,
  hidden,
  reduced,
  onClick,
  label,
}: {
  L: Layout;
  hidden: boolean;
  reduced: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <div data-tile="__add" style={{ width: L.tile, height: L.tile, position: "relative" }}>
      {!hidden && (
        <motion.div
          layoutId={reduced ? undefined : "tile-__add"}
          transition={cardSpring}
          style={{ width: "100%", height: "100%", borderRadius: L.radius }}
        >
          <button
            type="button"
            onClick={onClick}
            className="flex size-full flex-col items-center justify-center gap-2 border-[1.5px] border-dashed border-white/80 bg-white/16 px-2 text-center text-white transition-colors hover:bg-white/26"
            style={{ borderRadius: L.radius }}
          >
            <Plus size={26} strokeWidth={2} aria-hidden />
            <span className="text-[13px] leading-tight font-semibold">{label}</span>
          </button>
        </motion.div>
      )}
    </div>
  );
}

export function EmptyState({ L, addOpen, reduced, onAdd }: { L: Layout; addOpen: boolean; reduced: boolean; onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center gap-[22px] text-center">
      <AddTile L={L} hidden={addOpen} reduced={reduced} onClick={onAdd} label="Add your first school" />
      <div className="flex max-w-[340px] flex-col gap-1.5 text-white [text-shadow:0_1px_16px_rgba(0,0,0,0.45)]">
        <h2 className="m-0 font-serif text-[30px] font-medium tracking-[-0.01em]">Start your list</h2>
        <p className="m-0 text-[15px] leading-[1.45] text-pretty">
          Add each school you’re applying to. Only the name is required — fill in the rest whenever you have it.
        </p>
      </div>
    </div>
  );
}
