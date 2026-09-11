"use client";

import { useEffect, useState } from "react";
import Modal from "../Modal";
import PasswordInput from "./PasswordInput";
import type { WidgetDefinition } from "@/lib/widgets/registry";

export default function GenericWidgetConfigModal({
  definition,
  widgetId,
  initialConfig,
  onSave,
  onClose,
}: {
  definition: WidgetDefinition;
  widgetId: string;
  initialConfig: Record<string, unknown>;
  onSave: (config: Record<string, unknown>) => void;
  onClose: () => void;
}) {
  const supportsRefresh = definition.defaultRefreshSeconds != null;

  const [configValues, setConfigValues] = useState<Record<string, string | number | boolean>>(() => {
    const values: Record<string, string | number | boolean> = { label: (initialConfig.label as string) ?? "" };
    if (supportsRefresh) {
      values.refreshSeconds =
        (initialConfig.refreshSeconds as number) ?? definition.defaultRefreshSeconds ?? 300;
    }
    values.cardSize = (initialConfig.cardSize as string) || "full";
    if (definition.linkField) {
      values.linkToDevice = Boolean(initialConfig.linkToDevice);
    }
    for (const field of definition.configFields) {
      const existing = initialConfig[field.key];
      if (existing !== undefined) {
        values[field.key] = existing as string | number | boolean;
      } else if (field.defaultValue !== undefined) {
        values[field.key] = field.defaultValue;
      } else {
        // A checkbox with no value must default to false, not "" — an empty
        // string fails the server's boolean schema check and always shows
        // "Invalid configuration" regardless of what else was entered.
        values[field.key] = field.type === "checkbox" ? false : "";
      }
    }
    return values;
  });
  const [secretDrafts, setSecretDrafts] = useState<Record<string, string>>({});
  const [secretStatus, setSecretStatus] = useState<Record<string, boolean>>({});
  const [testState, setTestState] = useState<"idle" | "testing" | "ok" | "error">("idle");
  const [testMessage, setTestMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/widgets/${widgetId}/secrets`)
      .then((res) => res.json())
      .then((body) => setSecretStatus(body.status ?? {}))
      .catch(() => {});
  }, [widgetId]);

  function setField(key: string, value: string | number | boolean) {
    setConfigValues((prev) => ({ ...prev, [key]: value }));
  }

  async function testConnection() {
    setTestState("testing");
    setTestMessage(null);
    try {
      const res = await fetch("/api/widgets/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: definition.type, config: configValues, secrets: secretDrafts }),
      });
      const body = await res.json();
      if (body.ok) {
        setTestState("ok");
      } else {
        setTestState("error");
        setTestMessage(body.error || "Test failed");
      }
    } catch {
      setTestState("error");
      setTestMessage("Could not reach the server.");
    }
  }

  async function handleSave() {
    setSaving(true);
    const secretsToSave = Object.fromEntries(
      Object.entries(secretDrafts).filter(([, v]) => v.trim().length > 0),
    );
    if (Object.keys(secretsToSave).length > 0) {
      await fetch(`/api/widgets/${widgetId}/secrets`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secrets: secretsToSave }),
      }).catch(() => {});
    }
    setSaving(false);
    onSave(configValues);
  }

  const canSave = definition.configFields
    .filter((f) => f.type !== "checkbox")
    .every((f) => String(configValues[f.key] ?? "").trim().length > 0);

  return (
    <Modal title={definition.name} onClose={onClose} widthClass="max-w-md">
      <div className="flex flex-col gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-muted">Label (optional)</label>
          <input
            value={String(configValues.label ?? "")}
            onChange={(e) => setField("label", e.target.value)}
            placeholder={definition.name}
            className="w-full rounded-md border border-border bg-surface-2 px-2.5 py-1.5 text-sm text-foreground outline-none focus:border-accent"
          />
        </div>

        {supportsRefresh && (
          <div>
            <label className="mb-1 block text-xs font-medium text-muted">Refresh interval (seconds)</label>
            <input
              type="number"
              min={5}
              max={3600}
              value={String(configValues.refreshSeconds ?? "")}
              onChange={(e) => {
                const n = Number(e.target.value);
                setField("refreshSeconds", Number.isFinite(n) ? Math.min(3600, Math.max(5, Math.trunc(n))) : 5);
              }}
              className="w-28 rounded-md border border-border bg-surface-2 px-2.5 py-1.5 text-sm text-foreground outline-none focus:border-accent"
            />
          </div>
        )}

        <div>
          <label className="mb-1 block text-xs font-medium text-muted">Card height</label>
          <div className="flex gap-2">
            {(
              [
                { value: "full", label: "Full" },
                { value: "half", label: "Half" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setField("cardSize", opt.value)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                  (configValues.cardSize || "full") === opt.value
                    ? "bg-accent text-white"
                    : "border border-border text-muted hover:text-foreground"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <p className="mt-0.5 text-[11px] text-muted">
            Same width, less vertical space — Half shows a condensed version of the data.
          </p>
        </div>

        {definition.linkField && (
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={Boolean(configValues.linkToDevice)}
              onChange={(e) => setField("linkToDevice", e.target.checked)}
              className="accent-accent"
            />
            Link card to device
            <span className="text-xs text-muted">(opens it in a new tab)</span>
          </label>
        )}

        {definition.configFields.map((field) =>
          field.type === "checkbox" ? (
            <label key={field.key} className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={Boolean(configValues[field.key])}
                onChange={(e) => setField(field.key, e.target.checked)}
                className="accent-accent"
              />
              {field.label}
              {field.helpText && <span className="text-xs text-muted">({field.helpText})</span>}
            </label>
          ) : (
            <div key={field.key}>
              <label className="mb-1 block text-xs font-medium text-muted">{field.label}</label>
              <input
                type={field.type === "number" ? "number" : "text"}
                value={String(configValues[field.key] ?? "")}
                onChange={(e) =>
                  setField(field.key, field.type === "number" ? Number(e.target.value) : e.target.value)
                }
                placeholder={field.placeholder}
                className="w-full rounded-md border border-border bg-surface-2 px-2.5 py-1.5 text-sm text-foreground outline-none focus:border-accent"
              />
              {field.helpText && <p className="mt-0.5 text-[11px] text-muted">{field.helpText}</p>}
            </div>
          ),
        )}

        {definition.secretFields.length > 0 && (
          <div className="flex flex-col gap-3 border-t border-border pt-3">
            {definition.secretFields.map((field) => (
              <div key={field.key}>
                <label className="mb-1 block text-xs font-medium text-muted">{field.label}</label>
                <PasswordInput
                  value={secretDrafts[field.key] ?? ""}
                  onChange={(value) => setSecretDrafts((prev) => ({ ...prev, [field.key]: value }))}
                  placeholder={secretStatus[field.key] ? "•••••••••••• (configured)" : field.placeholder}
                />
                {field.helpText && <p className="mt-0.5 text-[11px] text-muted">{field.helpText}</p>}
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between border-t border-border pt-3">
          <button
            type="button"
            onClick={testConnection}
            disabled={testState === "testing"}
            className="rounded-md border border-border px-2.5 py-1 text-xs font-medium text-foreground hover:bg-surface-2 disabled:opacity-50"
          >
            {testState === "testing" ? "Testing…" : "Test connection"}
          </button>
          {testState === "ok" && <span className="text-xs text-emerald-500">Connected</span>}
          {testState === "error" && <span className="max-w-[60%] text-right text-xs text-red-400">{testMessage}</span>}
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-3 py-1.5 text-xs font-medium text-muted hover:bg-surface-3 hover:text-foreground"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!canSave || saving}
            onClick={handleSave}
            className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
