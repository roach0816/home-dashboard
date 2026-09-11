import "server-only";
import { connect } from "net";
import type { PingMonitorConfig } from "@/lib/types";

export type PingMonitorData = {
  up: boolean;
  latencyMs?: number;
};

export async function fetchPingMonitorData(config: PingMonitorConfig): Promise<PingMonitorData> {
  const { host, port } = config;
  if (!host) throw new Error("Host not configured.");

  const start = Date.now();
  return new Promise<PingMonitorData>((resolve) => {
    const socket = connect({ host, port, timeout: 5000 });
    const finish = (up: boolean) => {
      socket.destroy();
      resolve(up ? { up, latencyMs: Date.now() - start } : { up: false });
    };
    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false));
    socket.once("error", () => finish(false));
  });
}
