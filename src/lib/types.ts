export type Bookmark = {
  id: string;
  title: string;
  url: string;
  description?: string;
  /**
   * Either an Iconify icon id ("mdi:home-assistant", "selfhst:proxmox") or a
   * direct image URL. Unset falls back to an auto-fetched favicon.
   */
  icon?: string;
};

export type Category = {
  id: string;
  title: string;
  bookmarks: Bookmark[];
};

// ---- Widgets -------------------------------------------------------------
//
// Every widget config may set `label` to override its display name. Fields
// that hold credentials (API keys, passwords, tokens) are never part of
// these config types — they live in the server-only secret store, keyed by
// widget id (see src/lib/store.ts). The registry in src/lib/widgets/registry.ts
// declares which fields are secret for each widget type.

export type BaseWidgetConfig = {
  label?: string;
  /** How often to poll for new data. Ignored by widgets that don't auto-refresh (e.g. the speed test). */
  refreshSeconds?: number;
};

export type WeatherDisplayMode = "full" | "current" | "forecast";
export type WeatherWidgetConfig = BaseWidgetConfig & {
  stationId?: number;
  unit: "fahrenheit" | "celsius";
  display: WeatherDisplayMode;
  forecastDays: number;
};

export type HomeAssistantConfig = BaseWidgetConfig & {
  baseUrl: string;
  insecureTls?: boolean;
};

export type ProxmoxConfig = BaseWidgetConfig & {
  baseUrl: string;
  insecureTls?: boolean;
};

export type KubernetesConfig = BaseWidgetConfig & {
  apiUrl: string;
  insecureTls?: boolean;
};

export type AdguardConfig = BaseWidgetConfig & {
  baseUrl: string;
};

export type UnifiConfig = BaseWidgetConfig & {
  baseUrl: string;
  site: string;
  insecureTls?: boolean;
};

export type PiholeConfig = BaseWidgetConfig & {
  baseUrl: string;
};

export type PortainerConfig = BaseWidgetConfig & {
  baseUrl: string;
  insecureTls?: boolean;
};

export type PlexConfig = BaseWidgetConfig & {
  baseUrl: string;
};

export type JellyfinConfig = BaseWidgetConfig & {
  baseUrl: string;
};

export type SonarrConfig = BaseWidgetConfig & {
  baseUrl: string;
  calendarDays: number;
};

export type RadarrConfig = BaseWidgetConfig & {
  baseUrl: string;
  calendarDays: number;
};

export type TruenasConfig = BaseWidgetConfig & {
  baseUrl: string;
  insecureTls?: boolean;
};

export type UptimeKumaConfig = BaseWidgetConfig & {
  baseUrl: string;
};

export type EnphaseConfig = BaseWidgetConfig & {
  /** Local Envoy gateway IP/hostname, e.g. http://envoy.local */
  baseUrl: string;
};

export type SpeedtestConfig = BaseWidgetConfig;

export type NextcloudConfig = BaseWidgetConfig & {
  baseUrl: string;
};

export type PingMonitorConfig = BaseWidgetConfig & {
  host: string;
  port: number;
};

export type Widget =
  | { id: string; type: "tempest-weather"; config: WeatherWidgetConfig }
  | { id: string; type: "home-assistant"; config: HomeAssistantConfig }
  | { id: string; type: "proxmox"; config: ProxmoxConfig }
  | { id: string; type: "kubernetes"; config: KubernetesConfig }
  | { id: string; type: "adguard"; config: AdguardConfig }
  | { id: string; type: "unifi"; config: UnifiConfig }
  | { id: string; type: "pihole"; config: PiholeConfig }
  | { id: string; type: "portainer"; config: PortainerConfig }
  | { id: string; type: "plex"; config: PlexConfig }
  | { id: string; type: "jellyfin"; config: JellyfinConfig }
  | { id: string; type: "sonarr"; config: SonarrConfig }
  | { id: string; type: "radarr"; config: RadarrConfig }
  | { id: string; type: "truenas"; config: TruenasConfig }
  | { id: string; type: "uptime-kuma"; config: UptimeKumaConfig }
  | { id: string; type: "enphase"; config: EnphaseConfig }
  | { id: string; type: "speedtest"; config: SpeedtestConfig }
  | { id: string; type: "nextcloud"; config: NextcloudConfig }
  | { id: string; type: "ping-monitor"; config: PingMonitorConfig };

export type WidgetTypeId = Widget["type"];

export type DashboardData = {
  title: string;
  subtitle: string;
  categories: Category[];
  widgets: Widget[];
};
