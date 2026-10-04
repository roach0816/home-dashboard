import "server-only";
import type { MeshcoreHomeConfig } from "@/lib/types";
import { integrationFetch } from "@/lib/insecureFetch";
import { assertOk } from "./util";

export type MeshcoreHomeData = {
  appVersion: string;
  radioName?: string;
  /** MeshCore Home's radio.state: connected, connecting, backoff, paused, disabled, not_configured, lock_unavailable, starting. */
  radioState: string;
  radioDetail?: string;
  isSimulated: boolean;
  /** Seconds since the current radio connection came up; only while connected. */
  uptimeSeconds?: number;
  reconnects: number;
  /** Packets the radio has received and sent since MeshCore Home last connected to it. */
  received: number;
  sent: number;
  storedMessages: number;
  openGaps: number;
  unread: number;
  contacts: number;
  activeChannels: number;
  model?: string;
  firmware?: string;
  frequencyMHz?: number;
  bandwidthKHz?: number;
  spreadingFactor?: number;
};

type StatusBody = {
  app: { version: string };
  database: { messages: number };
  radio: {
    state: string;
    detail?: string;
    is_simulated: boolean;
    radio_name?: string | null;
    connected_since?: number | null;
    reconnects: number;
    received: number;
    sent: number;
  };
  gaps: Array<{ open: boolean }>;
  server_time: number;
};

type DeviceBody = {
  radio: {
    name?: string;
    device_info?: Record<string, string>;
    rf?: { freq?: number; bw?: number; sf?: number };
  } | null;
  channels: Array<{ active: boolean }>;
  contacts: number;
};

type ConversationBody = { blocked: boolean; archived: boolean; unread: number };

async function apiGet<T>(base: string, path: string, apiKey: string): Promise<T> {
  const res = await integrationFetch(`${base}${path}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
    cache: "no-store",
  });
  if (res.status === 401) throw new Error("MeshCore Home rejected the API key.");
  await assertOk(res, "MeshCore Home");
  return (await res.json()) as T;
}

export async function fetchMeshcoreHomeData(
  config: MeshcoreHomeConfig,
  secrets: Record<string, string>,
): Promise<MeshcoreHomeData> {
  const apiKey = secrets.apiKey;
  if (!apiKey) throw new Error("MeshCore Home API key not configured.");

  const base = config.baseUrl.replace(/\/$/, "");
  const [status, device, conversations] = await Promise.all([
    apiGet<StatusBody>(base, "/api/status", apiKey),
    apiGet<DeviceBody>(base, "/api/device", apiKey),
    apiGet<ConversationBody[]>(base, "/api/conversations", apiKey),
  ]);

  const radio = status.radio;
  const connectedSince = radio.connected_since ?? undefined;
  const info = device.radio?.device_info ?? {};
  const rf = device.radio?.rf;

  return {
    appVersion: status.app.version,
    radioName: radio.radio_name || device.radio?.name || undefined,
    radioState: radio.state,
    radioDetail: radio.detail || undefined,
    isSimulated: radio.is_simulated,
    uptimeSeconds: radio.state === "connected" && connectedSince ? Math.max(0, status.server_time - connectedSince) : undefined,
    reconnects: radio.reconnects,
    received: radio.received,
    sent: radio.sent,
    storedMessages: status.database.messages,
    openGaps: status.gaps.filter((g) => g.open).length,
    unread: conversations.filter((c) => !c.blocked && !c.archived).reduce((sum, c) => sum + c.unread, 0),
    contacts: device.contacts,
    activeChannels: device.channels.filter((c) => c.active).length,
    model: info.model || undefined,
    firmware: info["fw ver"] || undefined,
    frequencyMHz: rf?.freq,
    bandwidthKHz: rf?.bw,
    spreadingFactor: rf?.sf,
  };
}
