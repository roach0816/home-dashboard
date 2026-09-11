"use client";

import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Bookmark, Category } from "@/lib/types";
import BookmarkCard, { BookmarkForm } from "./BookmarkCard";

export default function Column({
  category,
  editing,
  onRenameCategory,
  onDeleteCategory,
  onAddBookmark,
  onUpdateBookmark,
  onDeleteBookmark,
}: {
  category: Category;
  editing: boolean;
  onRenameCategory: (title: string) => void;
  onDeleteCategory: () => void;
  onAddBookmark: (bookmark: Bookmark) => void;
  onUpdateBookmark: (bookmark: Bookmark) => void;
  onDeleteBookmark: (bookmarkId: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [titleDraft, setTitleDraft] = useState(category.title);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `col:${category.id}`,
    disabled: !editing,
  });

  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: `bin:${category.id}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  const bookmarkIds = category.bookmarks.map((b) => `bm:${b.id}`);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex h-fit min-w-0 flex-col rounded-xl border border-border bg-surface-1 shadow-sm"
    >
      <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
        {editing && (
          <button
            type="button"
            aria-label="Drag to reorder category"
            className="cursor-grab touch-none text-muted active:cursor-grabbing"
            {...attributes}
            {...listeners}
          >
            <GripIcon />
          </button>
        )}
        {editing ? (
          <input
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            onBlur={() => onRenameCategory(titleDraft.trim() || category.title)}
            className="min-w-0 flex-1 truncate rounded-md bg-transparent px-1 py-0.5 text-sm font-semibold uppercase tracking-wide text-foreground outline-none focus:bg-surface-2"
          />
        ) : (
          <h2 className="min-w-0 flex-1 truncate text-sm font-semibold uppercase tracking-wide text-foreground">
            {category.title}
          </h2>
        )}
        {editing && (
          <button
            type="button"
            aria-label="Delete category"
            onClick={onDeleteCategory}
            className="rounded p-1 text-muted hover:bg-red-500/10 hover:text-red-400"
          >
            <TrashIcon />
          </button>
        )}
      </div>

      <div
        ref={setDropRef}
        className={`flex flex-col gap-2 p-2.5 ${isOver ? "bg-accent/5" : ""}`}
      >
        <SortableContext items={bookmarkIds} strategy={verticalListSortingStrategy}>
          {category.bookmarks.map((bookmark) => (
            <BookmarkCard
              key={bookmark.id}
              bookmark={bookmark}
              editing={editing}
              onUpdate={onUpdateBookmark}
              onDelete={() => onDeleteBookmark(bookmark.id)}
            />
          ))}
        </SortableContext>

        {category.bookmarks.length === 0 && !editing && (
          <p className="px-1 py-2 text-xs text-muted">No links yet.</p>
        )}

        {editing && !adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="rounded-lg border border-dashed border-border px-3 py-2 text-left text-xs font-medium text-muted hover:border-accent/50 hover:text-accent"
          >
            + Add bookmark
          </button>
        )}

        {editing && adding && (
          <div className="rounded-lg border border-accent/40 bg-surface-2 p-3">
            <BookmarkForm
              submitLabel="Add"
              onCancel={() => setAdding(false)}
              onSubmit={(values) => {
                onAddBookmark({
                  id: crypto.randomUUID(),
                  title: values.title,
                  url: values.url,
                  description: values.description,
                  icon: values.icon,
                });
                setAdding(false);
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function GripIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <circle cx="5" cy="3" r="1.3" />
      <circle cx="11" cy="3" r="1.3" />
      <circle cx="5" cy="8" r="1.3" />
      <circle cx="11" cy="8" r="1.3" />
      <circle cx="5" cy="13" r="1.3" />
      <circle cx="11" cy="13" r="1.3" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    </svg>
  );
}
