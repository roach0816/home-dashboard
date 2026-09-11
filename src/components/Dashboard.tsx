"use client";

import { useEffect, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  arrayMove,
} from "@dnd-kit/sortable";
import type { Bookmark, Category, DashboardData, Widget, WidgetTypeId } from "@/lib/types";
import Column from "./Column";
import BookmarkCard from "./BookmarkCard";
import SettingsModal from "./SettingsModal";
import WidgetCard from "./WidgetCard";
import WidgetStoreModal from "./widgets/WidgetStoreModal";
import TempestConfigModal from "./widgets/TempestConfigModal";
import GenericWidgetConfigModal from "./widgets/GenericWidgetConfigModal";
import { getWidgetDefinition } from "@/lib/widgets/registry";

type ActiveDrag =
  | { type: "column"; id: string }
  | { type: "bookmark"; id: string }
  | { type: "widget"; id: string }
  | null;

function findContainerOf(categories: Category[], bookmarkId: string): string | undefined {
  return categories.find((c) => c.bookmarks.some((b) => b.id === bookmarkId))?.id;
}

export default function Dashboard({ initialData }: { initialData: DashboardData }) {
  const [categories, setCategories] = useState<Category[]>(initialData.categories);
  const [widgets, setWidgets] = useState<Widget[]>(initialData.widgets);
  const [title, setTitle] = useState(initialData.title);
  const [subtitle, setSubtitle] = useState(initialData.subtitle);
  const [editing, setEditing] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [storeOpen, setStoreOpen] = useState(false);
  const [pendingWidget, setPendingWidget] = useState<{ id: string; type: WidgetTypeId } | null>(null);
  const [active, setActive] = useState<ActiveDrag>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setSaveState("saving");
    const timer = setTimeout(() => {
      fetch("/api/data", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, subtitle, categories, widgets }),
      })
        .then((res) => {
          if (!res.ok) throw new Error("save failed");
          setSaveState("saved");
        })
        .catch(() => setSaveState("error"));
    }, 500);
    return () => clearTimeout(timer);
  }, [categories, widgets, title, subtitle]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragStart(event: DragStartEvent) {
    const id = String(event.active.id);
    if (id.startsWith("col:")) setActive({ type: "column", id: id.slice(4) });
    else if (id.startsWith("bm:")) setActive({ type: "bookmark", id: id.slice(3) });
    else if (id.startsWith("wid:")) setActive({ type: "widget", id: id.slice(4) });
  }

  function handleDragOver(event: DragOverEvent) {
    const { active: activeEvt, over } = event;
    if (!over) return;
    const activeIdRaw = String(activeEvt.id);
    if (!activeIdRaw.startsWith("bm:")) return;
    const activeId = activeIdRaw.slice(3);
    const overIdRaw = String(over.id);

    let overContainerId: string | undefined;
    if (overIdRaw.startsWith("bm:")) {
      overContainerId = findContainerOf(categories, overIdRaw.slice(3));
    } else if (overIdRaw.startsWith("bin:")) {
      overContainerId = overIdRaw.slice(4);
    }
    const activeContainerId = findContainerOf(categories, activeId);
    if (!overContainerId || !activeContainerId || activeContainerId === overContainerId) return;

    setCategories((prev) => {
      const activeCat = prev.find((c) => c.id === activeContainerId);
      const overCat = prev.find((c) => c.id === overContainerId);
      if (!activeCat || !overCat) return prev;
      const bookmark = activeCat.bookmarks.find((b) => b.id === activeId);
      if (!bookmark) return prev;

      let overIndex = overCat.bookmarks.findIndex((b) => `bm:${b.id}` === overIdRaw);
      if (overIndex === -1) overIndex = overCat.bookmarks.length;

      return prev.map((c) => {
        if (c.id === activeContainerId) {
          return { ...c, bookmarks: c.bookmarks.filter((b) => b.id !== activeId) };
        }
        if (c.id === overContainerId) {
          const next = [...c.bookmarks];
          next.splice(overIndex, 0, bookmark);
          return { ...c, bookmarks: next };
        }
        return c;
      });
    });
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active: activeEvt, over } = event;
    setActive(null);
    if (!over) return;
    const activeIdRaw = String(activeEvt.id);
    const overIdRaw = String(over.id);

    if (activeIdRaw.startsWith("col:")) {
      const activeCatId = activeIdRaw.slice(4);
      const overCatId = overIdRaw.startsWith("col:") ? overIdRaw.slice(4) : null;
      if (!overCatId || activeCatId === overCatId) return;
      setCategories((prev) => {
        const oldIndex = prev.findIndex((c) => c.id === activeCatId);
        const newIndex = prev.findIndex((c) => c.id === overCatId);
        if (oldIndex === -1 || newIndex === -1) return prev;
        return arrayMove(prev, oldIndex, newIndex);
      });
      return;
    }

    if (activeIdRaw.startsWith("wid:")) {
      const activeWidgetId = activeIdRaw.slice(4);
      const overWidgetId = overIdRaw.startsWith("wid:") ? overIdRaw.slice(4) : null;
      if (!overWidgetId || activeWidgetId === overWidgetId) return;
      setWidgets((prev) => {
        const oldIndex = prev.findIndex((w) => w.id === activeWidgetId);
        const newIndex = prev.findIndex((w) => w.id === overWidgetId);
        if (oldIndex === -1 || newIndex === -1) return prev;
        return arrayMove(prev, oldIndex, newIndex);
      });
      return;
    }

    if (activeIdRaw.startsWith("bm:")) {
      const activeId = activeIdRaw.slice(3);
      const overContainerId = overIdRaw.startsWith("bm:")
        ? findContainerOf(categories, overIdRaw.slice(3))
        : overIdRaw.startsWith("bin:")
          ? overIdRaw.slice(4)
          : undefined;
      if (!overContainerId) return;

      setCategories((prev) => {
        const cat = prev.find((c) => c.id === overContainerId);
        if (!cat) return prev;
        const oldIndex = cat.bookmarks.findIndex((b) => b.id === activeId);
        const newIndex = overIdRaw.startsWith("bm:")
          ? cat.bookmarks.findIndex((b) => `bm:${b.id}` === overIdRaw)
          : cat.bookmarks.length - 1;
        if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return prev;
        return prev.map((c) =>
          c.id === overContainerId ? { ...c, bookmarks: arrayMove(c.bookmarks, oldIndex, newIndex) } : c,
        );
      });
    }
  }

  function addCategory() {
    const id = crypto.randomUUID();
    setCategories((prev) => [...prev, { id, title: "New Category", bookmarks: [] }]);
  }

  function renameCategory(id: string, title: string) {
    setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, title } : c)));
  }

  function deleteCategory(id: string) {
    const cat = categories.find((c) => c.id === id);
    if (cat && cat.bookmarks.length > 0) {
      const ok = window.confirm(`Delete "${cat.title}" and its ${cat.bookmarks.length} link(s)?`);
      if (!ok) return;
    }
    setCategories((prev) => prev.filter((c) => c.id !== id));
  }

  function addBookmark(categoryId: string, bookmark: Bookmark) {
    setCategories((prev) =>
      prev.map((c) => (c.id === categoryId ? { ...c, bookmarks: [...c.bookmarks, bookmark] } : c)),
    );
  }

  function updateBookmark(categoryId: string, bookmark: Bookmark) {
    setCategories((prev) =>
      prev.map((c) =>
        c.id === categoryId
          ? { ...c, bookmarks: c.bookmarks.map((b) => (b.id === bookmark.id ? bookmark : b)) }
          : c,
      ),
    );
  }

  function deleteBookmark(categoryId: string, bookmarkId: string) {
    setCategories((prev) =>
      prev.map((c) => (c.id === categoryId ? { ...c, bookmarks: c.bookmarks.filter((b) => b.id !== bookmarkId) } : c)),
    );
  }

  function addWidget(widget: Widget) {
    setWidgets((prev) => [...prev, widget]);
  }

  function updateWidget(widget: Widget) {
    setWidgets((prev) => prev.map((w) => (w.id === widget.id ? widget : w)));
  }

  function deleteWidget(id: string) {
    setWidgets((prev) => prev.filter((w) => w.id !== id));
  }

  const activeBookmark =
    active?.type === "bookmark"
      ? categories.flatMap((c) => c.bookmarks).find((b) => b.id === active.id)
      : undefined;
  const activeWidget = active?.type === "widget" ? widgets.find((w) => w.id === active.id) : undefined;

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground">{title}</h1>
          {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-3">
          {editing && <SaveIndicator state={saveState} />}
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            aria-label="Dashboard settings"
            className="rounded-lg border border-border bg-surface-1 p-2 text-muted transition hover:bg-surface-2 hover:text-foreground"
          >
            <CogIcon />
          </button>
          <button
            type="button"
            onClick={() => setEditing((v) => !v)}
            className={`rounded-lg px-3.5 py-2 text-sm font-medium transition ${
              editing
                ? "bg-accent text-white hover:bg-accent/90"
                : "border border-border bg-surface-1 text-foreground hover:bg-surface-2"
            }`}
          >
            {editing ? "Done" : "Edit"}
          </button>
        </div>
      </header>

      {settingsOpen && (
        <SettingsModal
          title={title}
          subtitle={subtitle}
          onSave={(values) => {
            setTitle(values.title);
            setSubtitle(values.subtitle);
          }}
          onClose={() => setSettingsOpen(false)}
        />
      )}

      {storeOpen && (
        <WidgetStoreModal
          onPick={(type) => {
            setPendingWidget({ id: crypto.randomUUID(), type });
            setStoreOpen(false);
          }}
          onClose={() => setStoreOpen(false)}
        />
      )}

      {pendingWidget?.type === "tempest-weather" && (
        <TempestConfigModal
          widgetId={pendingWidget.id}
          onSave={(config) => {
            addWidget({ id: pendingWidget.id, type: "tempest-weather", config });
            setPendingWidget(null);
          }}
          onClose={() => setPendingWidget(null)}
        />
      )}

      {pendingWidget && pendingWidget.type !== "tempest-weather" && (
        <GenericWidgetConfigModal
          definition={getWidgetDefinition(pendingWidget.type)}
          widgetId={pendingWidget.id}
          initialConfig={{}}
          onSave={(config) => {
            addWidget({ id: pendingWidget.id, type: pendingWidget.type, config } as Widget);
            setPendingWidget(null);
          }}
          onClose={() => setPendingWidget(null)}
        />
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        {(widgets.length > 0 || editing) && (
          <SortableContext items={widgets.map((w) => `wid:${w.id}`)} strategy={rectSortingStrategy}>
            <div className="flex flex-wrap gap-4">
              {widgets.map((widget) => (
                <WidgetCard
                  key={widget.id}
                  widget={widget}
                  editing={editing}
                  onUpdate={updateWidget}
                  onDelete={() => deleteWidget(widget.id)}
                />
              ))}
              {editing && (
                <button
                  type="button"
                  onClick={() => setStoreOpen(true)}
                  className="flex h-[92px] w-full items-center justify-center rounded-xl border border-dashed border-border text-sm font-medium text-muted hover:border-accent/50 hover:text-accent sm:w-72 sm:flex-none"
                >
                  + Add widget
                </button>
              )}
            </div>
          </SortableContext>
        )}

        <SortableContext items={categories.map((c) => `col:${c.id}`)} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {categories.map((category) => (
              <Column
                key={category.id}
                category={category}
                editing={editing}
                onRenameCategory={(newTitle) => renameCategory(category.id, newTitle)}
                onDeleteCategory={() => deleteCategory(category.id)}
                onAddBookmark={(bookmark) => addBookmark(category.id, bookmark)}
                onUpdateBookmark={(bookmark) => updateBookmark(category.id, bookmark)}
                onDeleteBookmark={(bookmarkId) => deleteBookmark(category.id, bookmarkId)}
              />
            ))}
            {editing && (
              <button
                type="button"
                onClick={addCategory}
                className="flex h-24 items-center justify-center rounded-xl border border-dashed border-border text-sm font-medium text-muted hover:border-accent/50 hover:text-accent"
              >
                + Add category
              </button>
            )}
          </div>
        </SortableContext>

        <DragOverlay>
          {activeBookmark ? (
            <div className="w-72 rounded-lg border border-accent/50 bg-surface-2 shadow-lg">
              <BookmarkCard bookmark={activeBookmark} editing={false} onUpdate={() => {}} onDelete={() => {}} />
            </div>
          ) : activeWidget ? (
            <div className="w-72 rounded-xl border border-accent/50 bg-surface-1 p-3.5 shadow-lg">
              <p className="text-sm font-medium text-foreground">
                {activeWidget.config.label || getWidgetDefinition(activeWidget.type).name}
              </p>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {categories.length === 0 && !editing && (
        <p className="text-sm text-muted">No categories yet. Click Edit to add one.</p>
      )}
    </div>
  );
}

function SaveIndicator({ state }: { state: "idle" | "saving" | "saved" | "error" }) {
  if (state === "idle") return null;
  const label = state === "saving" ? "Saving…" : state === "saved" ? "Saved" : "Save failed";
  const color = state === "error" ? "text-red-400" : "text-muted";
  return <span className={`text-xs ${color}`}>{label}</span>;
}

function CogIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
    </svg>
  );
}
