"use client";

import { useEffect, useState } from "react";
import Modal from "../Modal";
import PasswordInput from "./PasswordInput";
import type { AdguardConfig, AdguardNode, WidgetCardSize } from "@/lib/types";

type NodeDraft = AdguardNode & {
  usernameDraft: string;
  passwordDraft: string;
};

type TestState = "idle" | "testing" | "ok" | "error";

function newNode(): NodeDraft {
  return { id: crypto.randomUUID(), label: "", baseUrl: "", usernameDraft: "", passwordDraft: "" };
}

export default function AdguardConfigModal({
  widgetId,
  initial,
  onSave,
  onClose,
}: {
  widgetId: string;
  initial?: Partial<AdguardConfig>;
  onSave: (config: AdguardConfig) => void;
  onClose: () => void;
}) {
  const [nodes, setNodes] = useState<NodeDraft[]>(() =>
    initial?.nodes && initial.nodes.length > 0
      ? initial.nodes.map((n) => ({ ...n, usernameDraft: "", passwordDraft: "" }))
      : [newNode()],
  );
  const [secretStatus, setSecretStatus] = useState<Record<string, boolean>>({});
  const [testState, setTestState] = useState<Record<string, TestState>>({});
  const [testMessage, setTestMessage] = useState<Record<string, string>>({});
  const [label, setLabel] = useState(initial?.label ?? "");
  const [refreshSeconds, setRefreshSeconds] = useState(initial?.refreshSeconds ?? 300);
  const [cardSize, setCardSize] = useState<WidgetCardSize>(initial?.cardSize ?? "full");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/widgets/${widgetId}/secrets`)
      .then((res) => res.json())
      .then((body) => setSecretStatus(body.status ?? {}))
      .catch(() => {});
  }, [widgetId]);

  function isConfigured(node: NodeDraft, field: "username" | "password") {
    if (secretStatus[`${node.id}:${field}`]) return true;
    // Legacy single-node widgets stored credentials under the flat key.
    return node.id === "default" && Boolean(secretStatus[field]);
  }

  function updateNode(id: string, patch: Partial<NodeDraft>) {
    setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, ...patch } : n)));
  }

  function addNode() {
    setNodes((prev) => [...prev, newNode()]);
  }

  function removeNode(id: string) {
    setNodes((prev) => (prev.length > 1 ? prev.filter((n) => n.id !== id) : prev));
  }

  async function testNode(node: NodeDraft) {
    setTestState((prev) => ({ ...prev, [node.id]: "testing" }));
    setTestMessage((prev) => ({ ...prev, [node.id]: "" }));
    try {
      const res = await fetch("/api/widgets/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "adguard",
          config: { nodes: [{ id: node.id, label: node.label, baseUrl: node.baseUrl }] },
          secrets: { [`${node.id}:username`]: node.usernameDraft, [`${node.id}:password`]: node.passwordDraft },
          widgetId,
        }),
      });
      const body = await res.json();
      if (body.ok) {
        setTestState((prev) => ({ ...prev, [node.id]: "ok" }));
      } else {
        setTestState((prev) => ({ ...prev, [node.id]: "error" }));
        setTestMessage((prev) => ({ ...prev, [node.id]: body.error || "Test failed" }));
      }
    } catch {
      setTestState((prev) => ({ ...prev, [node.id]: "error" }));
      setTestMessage((prev) => ({ ...prev, [node.id]: "Could not reach the server." }));
    }
  }

  async function handleSave() {
    setSaving(true);
    const secretsToSave: Record<string, string> = {};
    for (const node of nodes) {
      if (node.usernameDraft.trim()) secretsToSave[`${node.id}:username`] = node.usernameDraft.trim();
      if (node.passwordDraft.trim()) secretsToSave[`${node.id}:password`] = node.passwordDraft.trim();
    }
    if (Object.keys(secretsToSave).length > 0) {
      await fetch(`/api/widgets/${widgetId}/secrets`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secrets: secretsToSave }),
      }).catch(() => {});
    }
    setSaving(false);
    onSave({
      label: label.trim() || undefined,
      refreshSeconds,
      cardSize,
      nodes: nodes.map(({ id, label: nodeLabel, baseUrl }) => ({ id, label: nodeLabel.trim(), baseUrl: baseUrl.trim() })),
    });
  }

  const canSave = nodes.every((n) => n.baseUrl.trim().length > 0);

  return (
    <Modal title="AdGuard Home" onClose={onClose} widthClass="max-w-lg">
      <div className="flex flex-col gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-muted">Label (optional)</label>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="AdGuard Home"
            className="w-full rounded-md border border-border bg-surface-2 px-2.5 py-1.5 text-sm text-foreground outline-none focus:border-accent"
          />
        </div>

        <div className="flex gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted">Refresh interval (seconds)</label>
            <input
              type="number"
              min={5}
              max={3600}
              value={refreshSeconds}
              onChange={(e) => {
                const n = Number(e.target.value);
                setRefreshSeconds(Number.isFinite(n) ? Math.min(3600, Math.max(5, Math.trunc(n))) : 5);
              }}
              className="w-28 rounded-md border border-border bg-surface-2 px-2.5 py-1.5 text-sm text-foreground outline-none focus:border-accent"
            />
          </div>
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
                  onClick={() => setCardSize(opt.value)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                    cardSize === opt.value ? "bg-accent text-white" : "border border-border text-muted hover:text-foreground"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-border pt-3">
          <p className="text-xs font-medium text-muted">
            AdGuard nodes — add each instance you want combined, then pick &ldquo;All&rdquo; or a single node on the widget.
          </p>
          {nodes.map((node, i) => (
            <div key={node.id} className="flex flex-col gap-2 rounded-lg border border-border p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted">Node {i + 1}</span>
                <button
                  type="button"
                  onClick={() => removeNode(node.id)}
                  disabled={nodes.length === 1}
                  className="text-xs text-muted hover:text-red-400 disabled:opacity-30"
                >
                  Remove
                </button>
              </div>
              <input
                value={node.label}
                onChange={(e) => updateNode(node.id, { label: e.target.value })}
                placeholder={`Node ${i + 1} label (e.g. Living room Pi)`}
                className="w-full rounded-md border border-border bg-surface-2 px-2.5 py-1.5 text-sm text-foreground outline-none focus:border-accent"
              />
              <input
                value={node.baseUrl}
                onChange={(e) => updateNode(node.id, { baseUrl: e.target.value })}
                placeholder="http://adguard.local"
                className="w-full rounded-md border border-border bg-surface-2 px-2.5 py-1.5 text-sm text-foreground outline-none focus:border-accent"
              />
              <PasswordInput
                value={node.usernameDraft}
                onChange={(v) => updateNode(node.id, { usernameDraft: v })}
                placeholder={isConfigured(node, "username") ? "•••••••••••• (configured)" : "Username"}
              />
              <PasswordInput
                value={node.passwordDraft}
                onChange={(v) => updateNode(node.id, { passwordDraft: v })}
                placeholder={isConfigured(node, "password") ? "•••••••••••• (configured)" : "Password"}
              />
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => testNode(node)}
                  disabled={testState[node.id] === "testing" || !node.baseUrl.trim()}
                  className="rounded-md border border-border px-2.5 py-1 text-xs font-medium text-foreground hover:bg-surface-2 disabled:opacity-50"
                >
                  {testState[node.id] === "testing" ? "Testing…" : "Test connection"}
                </button>
                {testState[node.id] === "ok" && <span className="text-xs text-emerald-500">Connected</span>}
                {testState[node.id] === "error" && (
                  <span className="max-w-[60%] text-right text-xs text-red-400">{testMessage[node.id]}</span>
                )}
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={addNode}
            className="rounded-md border border-dashed border-border px-3 py-1.5 text-xs font-medium text-muted hover:border-accent/50 hover:text-accent"
          >
            + Add another node
          </button>
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
