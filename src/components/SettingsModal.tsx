"use client";

import { useState } from "react";
import Modal from "./Modal";
import { THEMES, type ThemeId } from "@/lib/themes";

export default function SettingsModal({
  title,
  subtitle,
  theme,
  onSave,
  onClose,
}: {
  title: string;
  subtitle: string;
  theme: ThemeId;
  onSave: (values: { title: string; subtitle: string; theme: ThemeId }) => void;
  onClose: () => void;
}) {
  const [titleDraft, setTitleDraft] = useState(title);
  const [subtitleDraft, setSubtitleDraft] = useState(subtitle);
  const [themeDraft, setThemeDraft] = useState<ThemeId>(theme);

  return (
    <Modal title="Dashboard settings" onClose={onClose}>
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          onSave({ title: titleDraft.trim() || "Home Dashboard", subtitle: subtitleDraft.trim(), theme: themeDraft });
          onClose();
        }}
      >
        <div>
          <label className="mb-1 block text-xs font-medium text-muted">Title</label>
          <input
            autoFocus
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            className="w-full rounded-md border border-border bg-surface-2 px-2.5 py-1.5 text-sm text-foreground outline-none focus:border-accent"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted">Subtitle</label>
          <input
            value={subtitleDraft}
            onChange={(e) => setSubtitleDraft(e.target.value)}
            className="w-full rounded-md border border-border bg-surface-2 px-2.5 py-1.5 text-sm text-foreground outline-none focus:border-accent"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted">Theme</label>
          <div className="grid grid-cols-3 gap-2">
            {THEMES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setThemeDraft(t.id)}
                className={`flex flex-col items-center gap-1.5 rounded-md border p-2 transition ${
                  themeDraft === t.id ? "border-accent ring-1 ring-accent" : "border-border hover:border-muted"
                }`}
              >
                <span
                  className="flex h-8 w-full items-center justify-center gap-1 rounded"
                  style={{ background: t.swatch.background }}
                >
                  <span className="h-3.5 w-3.5 rounded-full" style={{ background: t.swatch.surface }} />
                  <span className="h-3.5 w-3.5 rounded-full" style={{ background: t.swatch.accent }} />
                </span>
                <span className="text-[11px] font-medium text-foreground">{t.name}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-3 py-1.5 text-xs font-medium text-muted hover:bg-surface-3 hover:text-foreground"
          >
            Cancel
          </button>
          <button type="submit" className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground">
            Save
          </button>
        </div>
      </form>
    </Modal>
  );
}
