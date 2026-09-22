import "server-only";
import type { Widget } from "@/lib/types";
import { fetchTempestWidgetData } from "@/lib/tempest";
import { fetchHomeAssistantData } from "./homeAssistant";
import { fetchProxmoxData } from "./proxmox";
import { fetchKubernetesData } from "./kubernetes";
import { fetchAdguardData } from "./adguard";
import { fetchUnifiData } from "./unifi";
import { fetchPiholeData } from "./pihole";
import { fetchPortainerData } from "./portainer";
import { fetchPlexData } from "./plex";
import { fetchJellyfinData } from "./jellyfin";
import { fetchSonarrData } from "./sonarr";
import { fetchRadarrData } from "./radarr";
import { fetchTruenasData } from "./truenas";
import { fetchUptimeKumaData } from "./uptimeKuma";
import { fetchEnphaseData } from "./enphase";
import { fetchNextcloudData } from "./nextcloud";
import { fetchPingMonitorData } from "./pingMonitor";
import { fetchPrinterData } from "./printer";
import { fetchSynologyData } from "./synology";
import { fetchHdhomerunData } from "./hdhomerun";
import { fetchSportsTeamData } from "./sports";

/**
 * Dispatches to the right integration client based on widget type. Takes
 * the full widget (not just its config) so TypeScript can narrow
 * `widget.config` to the right shape from `widget.type` in each branch.
 */
export async function fetchWidgetData(widget: Widget, secrets: Record<string, string>): Promise<unknown> {
  switch (widget.type) {
    case "tempest-weather":
      return fetchTempestWidgetData(widget.config, secrets);
    case "home-assistant":
      return fetchHomeAssistantData(widget.config, secrets);
    case "proxmox":
      return fetchProxmoxData(widget.config, secrets);
    case "kubernetes":
      return fetchKubernetesData(widget.config, secrets);
    case "adguard":
      return fetchAdguardData(widget.config, secrets);
    case "unifi":
      return fetchUnifiData(widget.config, secrets);
    case "pihole":
      return fetchPiholeData(widget.config, secrets);
    case "portainer":
      return fetchPortainerData(widget.config, secrets);
    case "plex":
      return fetchPlexData(widget.config, secrets);
    case "jellyfin":
      return fetchJellyfinData(widget.config, secrets);
    case "sonarr":
      return fetchSonarrData(widget.config, secrets);
    case "radarr":
      return fetchRadarrData(widget.config, secrets);
    case "truenas":
      return fetchTruenasData(widget.config, secrets);
    case "uptime-kuma":
      return fetchUptimeKumaData(widget.config, secrets);
    case "enphase":
      return fetchEnphaseData(widget.config, secrets);
    case "speedtest":
      throw new Error("The speed test runs in your browser, not on the server.");
    case "nextcloud":
      return fetchNextcloudData(widget.config, secrets);
    case "ping-monitor":
      return fetchPingMonitorData(widget.config);
    case "printer-snmp":
      return fetchPrinterData(widget.config, secrets);
    case "synology":
      return fetchSynologyData(widget.config, secrets);
    case "hdhomerun":
      return fetchHdhomerunData(widget.config);
    case "sports-team":
      return fetchSportsTeamData(widget.config);
  }
}
