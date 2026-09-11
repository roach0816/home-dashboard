"use client";

import { useEffect, useRef, useState } from "react";
import Modal from "./Modal";
import { iconifySearchUrl, iconifyUrl } from "@/lib/icon";

export default function IconPicker({
  onSelect,
  onClose,
}: {
  onSelect: (icon: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [customUrl, setCustomUrl] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  const trimmedQuery = query.trim();

  useEffect(() => {
    abortRef.current?.abort();
    if (trimmedQuery.length < 2) {
      return;
    }
    const controller = new AbortController();
    abortRef.current = controller;
    const timer = setTimeout(() => {
      setLoading(true);
      fetch(iconifySearchUrl(trimmedQuery), { signal: controller.signal })
        .then((res) => res.json())
        .then((data) => setResults(Array.isArray(data.icons) ? data.icons : []))
        .catch((err) => {
          if (err?.name !== "AbortError") setResults([]);
        })
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [trimmedQuery]);

  const showResults = trimmedQuery.length >= 2;
  const displayResults = showResults ? results : [];
  const displayLoading = showResults && loading;

  return (
    <Modal title="Choose an icon" onClose={onClose} widthClass="max-w-lg">
      <div className="flex flex-col gap-3">
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search (e.g. home assistant, proxmox, hue, router)"
          className="rounded-md border border-border bg-surface-2 px-2.5 py-1.5 text-sm text-foreground outline-none focus:border-accent"
        />
        <p className="text-xs text-muted">
          Searches Material Design Icons and thousands of app/brand logos via{" "}
          <a
            href="https://icon-sets.iconify.design/"
            target="_blank"
            rel="noreferrer"
            className="underline hover:text-foreground"
          >
            Iconify
          </a>
          .
        </p>

        {displayLoading && <p className="text-xs text-muted">Searching…</p>}
        {!displayLoading && showResults && displayResults.length === 0 && (
          <p className="text-xs text-muted">No icons found for &ldquo;{trimmedQuery}&rdquo;.</p>
        )}

        {displayResults.length > 0 && (
          <div className="grid grid-cols-6 gap-2 sm:grid-cols-8">
            {displayResults.map((id) => (
              <button
                key={id}
                type="button"
                title={id}
                onClick={() => onSelect(id)}
                className="flex aspect-square items-center justify-center rounded-lg border border-border bg-white p-1.5 hover:border-accent"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={iconifyUrl(id)} alt={id} className="h-full w-full object-contain" loading="lazy" />
              </button>
            ))}
          </div>
        )}

        <div className="border-t border-border pt-3">
          <label className="mb-1 block text-xs font-medium text-muted">Or paste a custom image URL</label>
          <div className="flex gap-2">
            <input
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              placeholder="https://example.com/logo.png"
              className="min-w-0 flex-1 rounded-md border border-border bg-surface-2 px-2.5 py-1.5 text-sm text-foreground outline-none focus:border-accent"
            />
            <button
              type="button"
              disabled={!customUrl.trim()}
              onClick={() => onSelect(customUrl.trim())}
              className="shrink-0 rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40"
            >
              Use
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
