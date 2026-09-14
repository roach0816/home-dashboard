import "server-only";
import dgram from "node:dgram";

/**
 * A Tempest Hub broadcasts UDP JSON messages on the local network — see
 * https://weatherflow.github.io/Tempest/api/udp/v171/. This only covers
 * current conditions (the "obs_st" message); forecast data still requires
 * the cloud API, so this is layered on top of that in
 * src/lib/integrations/tempest.ts rather than replacing it.
 *
 * Note: this only works if UDP broadcast traffic from the Tempest Hub
 * actually reaches this process's network namespace. In a typical K3s pod
 * on an overlay CNI (Flannel etc.), it generally won't — LAN broadcast
 * traffic doesn't cross into the pod network unless the pod runs with
 * hostNetwork: true.
 */

export type LocalObservation = {
  serialNumber: string;
  epochSeconds: number;
  /** m/s */
  windAvgMs: number;
  /** degrees, 0-360 */
  windDirectionDeg: number;
  /** °C */
  airTemperatureC: number;
  /** % relative humidity */
  relativeHumidity: number;
  receivedAt: number;
};

const PORT = 50222;
// obs_st normally arrives about once a minute; 5 minutes is a generous
// margin before treating a reading as stale (hub offline, or broadcasts
// no longer reaching us).
const STALE_AFTER_MS = 5 * 60 * 1000;

type ListenerState = {
  socket: dgram.Socket;
  latest: Map<string, LocalObservation>;
};

declare global {
  // Guards against Next.js dev-mode hot-reload re-evaluating this module
  // and binding a second socket to the same port.
  var __tempestUdpListener: ListenerState | undefined;
}

function ensureListener(): ListenerState {
  if (globalThis.__tempestUdpListener) return globalThis.__tempestUdpListener;

  const latest = new Map<string, LocalObservation>();
  const socket = dgram.createSocket({ type: "udp4", reuseAddr: true });

  socket.on("message", (msg) => {
    try {
      const parsed = JSON.parse(msg.toString("utf-8")) as {
        type?: string;
        serial_number?: string;
        obs?: number[][];
      };
      if (parsed.type !== "obs_st" || !parsed.serial_number || !Array.isArray(parsed.obs) || !parsed.obs[0]) {
        return; // rapid_wind, hub_status, device_status, etc. — not what we're after here.
      }
      const o = parsed.obs[0];
      latest.set(parsed.serial_number, {
        serialNumber: parsed.serial_number,
        epochSeconds: o[0],
        windAvgMs: o[2],
        windDirectionDeg: o[4],
        airTemperatureC: o[7],
        relativeHumidity: o[8],
        receivedAt: Date.now(),
      });
    } catch {
      // Malformed or unrecognized packet — ignore rather than take down the listener.
    }
  });

  socket.on("error", (err) => {
    console.error("[tempest-udp] socket error:", err.message);
  });

  try {
    socket.bind(PORT, () => socket.setBroadcast(true));
  } catch (err) {
    console.error("[tempest-udp] failed to bind:", err instanceof Error ? err.message : err);
  }

  const state: ListenerState = { socket, latest };
  globalThis.__tempestUdpListener = state;
  return state;
}

/**
 * The latest local observation for a station, or undefined if none has
 * been received (yet, or ever — most likely because broadcasts aren't
 * reaching this network namespace). When `serialNumber` is omitted, only
 * returns a result if exactly one station has been heard from, since
 * there's no way to know which one is wanted with more than one.
 */
export function getLatestLocalObservation(serialNumber?: string): LocalObservation | undefined {
  const { latest } = ensureListener();
  const isFresh = (obs: LocalObservation) => Date.now() - obs.receivedAt < STALE_AFTER_MS;

  if (serialNumber) {
    const obs = latest.get(serialNumber);
    return obs && isFresh(obs) ? obs : undefined;
  }

  const fresh = Array.from(latest.values()).filter(isFresh);
  return fresh.length === 1 ? fresh[0] : undefined;
}
