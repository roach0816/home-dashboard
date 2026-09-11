"use client";

import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Bookmark } from "@/lib/types";
import { normalizeUrl, hostnameOf } from "@/lib/url";
import SiteIcon from "./SiteIcon";
import IconPicker from "./IconPicker";

export default function BookmarkCard({
  bookmark,
  editing,
  onUpdate,
  onDelete,
}: {
  bookmark: Bookmark;
  editing: boolean;
  onUpdate: (bookmark: Bookmark) => void;
  onDelete: () => void;
}) {
  const [isEditingSelf, setIsEditingSelf] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: `bm:${bookmark.id}`, disabled: !editing || isEditingSelf });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  if (isEditingSelf) {
    return (
      <div ref={setNodeRef} style={style} className="rounded-lg border border-accent/40 bg-surface-2 p-3">
        <BookmarkForm
          initial={bookmark}
          submitLabel="Save"
          onCancel={() => setIsEditingSelf(false)}
          onSubmit={(values) => {
            onUpdate({ ...bookmark, ...values });
            setIsEditingSelf(false);
          }}
        />
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group relative flex items-center gap-3 rounded-lg border border-border bg-surface-2 p-3 transition hover:border-accent/50 hover:bg-surface-3"
    >
      {editing && (
        <button
          type="button"
          aria-label="Drag to reorder"
          className="cursor-grab touch-none text-muted active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <GripIcon />
        </button>
      )}

      <a
        href={editing ? undefined : normalizeUrl(bookmark.url)}
        target="_blank"
        rel="noreferrer noopener"
        className={`flex min-w-0 flex-1 items-center gap-3 ${editing ? "pointer-events-none" : ""}`}
        tabIndex={editing ? -1 : 0}
      >
        <SiteIcon title={bookmark.title} url={bookmark.url} icon={bookmark.icon} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-foreground">{bookmark.title}</span>
          <span className="block truncate text-xs text-muted">
            {bookmark.description || hostnameOf(bookmark.url)}
          </span>
        </span>
      </a>

      {editing && (
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            aria-label="Edit bookmark"
            onClick={() => setIsEditingSelf(true)}
            className="rounded p-1.5 text-muted hover:bg-surface-3 hover:text-foreground"
          >
            <PencilIcon />
          </button>
          <button
            type="button"
            aria-label="Delete bookmark"
            onClick={onDelete}
            className="rounded p-1.5 text-muted hover:bg-red-500/10 hover:text-red-400"
          >
            <TrashIcon />
          </button>
        </div>
      )}
    </div>
  );
}

export function BookmarkForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial?: Partial<Bookmark>;
  submitLabel: string;
  onSubmit: (values: { title: string; url: string; description?: string; icon?: string }) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [url, setUrl] = useState(initial?.url ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [icon, setIcon] = useState(initial?.icon);
  const [pickerOpen, setPickerOpen] = useState(false);

  const canSubmit = title.trim().length > 0 && url.trim().length > 0;

  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (!canSubmit) return;
        onSubmit({
          title: title.trim(),
          url: normalizeUrl(url.trim()),
          description: description.trim() || undefined,
          icon,
        });
      }}
    >
      <div className="flex items-center gap-2.5">
        <button type="button" onClick={() => setPickerOpen(true)} aria-label="Choose icon">
          <SiteIcon title={title || "?"} url={url || "https://example.com"} icon={icon} size={36} />
        </button>
        <div className="flex flex-col items-start gap-0.5">
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="text-xs font-medium text-accent hover:underline"
          >
            Choose icon…
          </button>
          {icon && (
            <button
              type="button"
              onClick={() => setIcon(undefined)}
              className="text-[11px] text-muted hover:text-foreground"
            >
              Reset to auto favicon
            </button>
          )}
        </div>
      </div>

      {pickerOpen && (
        <IconPicker
          onSelect={(id) => {
            setIcon(id);
            setPickerOpen(false);
          }}
          onClose={() => setPickerOpen(false)}
        />
      )}

      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Name"
        className="rounded-md border border-border bg-surface-1 px-2 py-1.5 text-sm text-foreground outline-none focus:border-accent"
      />
      <input
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="URL (e.g. http://nas.local)"
        className="rounded-md border border-border bg-surface-1 px-2 py-1.5 text-sm text-foreground outline-none focus:border-accent"
      />
      <input
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description (optional)"
        className="rounded-md border border-border bg-surface-1 px-2 py-1.5 text-sm text-foreground outline-none focus:border-accent"
      />
      <div className="flex justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md px-2.5 py-1 text-xs font-medium text-muted hover:bg-surface-3 hover:text-foreground"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!canSubmit}
          className="rounded-md bg-accent px-2.5 py-1 text-xs font-medium text-white disabled:opacity-40"
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );
}

function GripIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
      <circle cx="5" cy="3" r="1.3" />
      <circle cx="11" cy="3" r="1.3" />
      <circle cx="5" cy="8" r="1.3" />
      <circle cx="11" cy="8" r="1.3" />
      <circle cx="5" cy="13" r="1.3" />
      <circle cx="11" cy="13" r="1.3" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    </svg>
  );
}
