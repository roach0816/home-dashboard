"use client";

import { useState } from "react";
import Modal from "./Modal";

export default function SettingsModal({
  title,
  subtitle,
  onSave,
  onClose,
}: {
  title: string;
  subtitle: string;
  onSave: (values: { title: string; subtitle: string }) => void;
  onClose: () => void;
}) {
  const [titleDraft, setTitleDraft] = useState(title);
  const [subtitleDraft, setSubtitleDraft] = useState(subtitle);

  return (
    <Modal title="Dashboard settings" onClose={onClose}>
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          onSave({ title: titleDraft.trim() || "Home Dashboard", subtitle: subtitleDraft.trim() });
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
        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-3 py-1.5 text-xs font-medium text-muted hover:bg-surface-3 hover:text-foreground"
          >
            Cancel
          </button>
          <button type="submit" className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white">
            Save
          </button>
        </div>
      </form>
    </Modal>
  );
}
