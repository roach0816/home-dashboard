"use client";

import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Widget } from "@/lib/types";
import { getWidgetDefinition } from "@/lib/widgets/registry";
import GenericWidgetConfigModal from "./widgets/GenericWidgetConfigModal";
import TempestConfigModal from "./widgets/TempestConfigModal";
import TempestDisplay from "./widgets/displays/TempestDisplay";
import HomeAssistantDisplay from "./widgets/displays/HomeAssistantDisplay";
import ProxmoxDisplay from "./widgets/displays/ProxmoxDisplay";
import KubernetesDisplay from "./widgets/displays/KubernetesDisplay";
import AdguardDisplay from "./widgets/displays/AdguardDisplay";
import UnifiDisplay from "./widgets/displays/UnifiDisplay";
import PiholeDisplay from "./widgets/displays/PiholeDisplay";
import PortainerDisplay from "./widgets/displays/PortainerDisplay";
import PlexDisplay from "./widgets/displays/PlexDisplay";
import JellyfinDisplay from "./widgets/displays/JellyfinDisplay";
import SonarrDisplay from "./widgets/displays/SonarrDisplay";
import RadarrDisplay from "./widgets/displays/RadarrDisplay";
import TruenasDisplay from "./widgets/displays/TruenasDisplay";
import UptimeKumaDisplay from "./widgets/displays/UptimeKumaDisplay";
import EnphaseDisplay from "./widgets/displays/EnphaseDisplay";
import SpeedtestDisplay from "./widgets/displays/SpeedtestDisplay";
import NextcloudDisplay from "./widgets/displays/NextcloudDisplay";
import PingMonitorDisplay from "./widgets/displays/PingMonitorDisplay";
import PrinterDisplay from "./widgets/displays/PrinterDisplay";

function WidgetDisplay({ widget, compact }: { widget: Widget; compact: boolean }) {
  switch (widget.type) {
    case "tempest-weather":
      return <TempestDisplay widget={widget} compact={compact} />;
    case "home-assistant":
      return <HomeAssistantDisplay widget={widget} compact={compact} />;
    case "proxmox":
      return <ProxmoxDisplay widget={widget} compact={compact} />;
    case "kubernetes":
      return <KubernetesDisplay widget={widget} compact={compact} />;
    case "adguard":
      return <AdguardDisplay widget={widget} compact={compact} />;
    case "unifi":
      return <UnifiDisplay widget={widget} compact={compact} />;
    case "pihole":
      return <PiholeDisplay widget={widget} compact={compact} />;
    case "portainer":
      return <PortainerDisplay widget={widget} compact={compact} />;
    case "plex":
      return <PlexDisplay widget={widget} compact={compact} />;
    case "jellyfin":
      return <JellyfinDisplay widget={widget} compact={compact} />;
    case "sonarr":
      return <SonarrDisplay widget={widget} compact={compact} />;
    case "radarr":
      return <RadarrDisplay widget={widget} compact={compact} />;
    case "truenas":
      return <TruenasDisplay widget={widget} compact={compact} />;
    case "uptime-kuma":
      return <UptimeKumaDisplay widget={widget} compact={compact} />;
    case "enphase":
      return <EnphaseDisplay widget={widget} compact={compact} />;
    case "speedtest":
      return <SpeedtestDisplay widget={widget} compact={compact} />;
    case "nextcloud":
      return <NextcloudDisplay widget={widget} compact={compact} />;
    case "ping-monitor":
      return <PingMonitorDisplay widget={widget} compact={compact} />;
    case "printer-snmp":
      return <PrinterDisplay widget={widget} compact={compact} />;
  }
}

/** Value of the widget's registry-declared `linkField`, if it's a non-empty string. */
function linkFieldValue(widget: Widget): string | undefined {
  const definition = getWidgetDefinition(widget.type);
  if (!definition.linkField) return undefined;
  const value = (widget.config as Record<string, unknown>)[definition.linkField];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function deviceHref(widget: Widget): string | undefined {
  const value = linkFieldValue(widget);
  if (!value) return undefined;
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(value) ? value : `http://${value}`;
}

export default function WidgetCard({
  widget,
  editing,
  onUpdate,
  onDelete,
}: {
  widget: Widget;
  editing: boolean;
  onUpdate: (widget: Widget) => void;
  onDelete: () => void;
}) {
  const [configuring, setConfiguring] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `wid:${widget.id}`,
    disabled: !editing,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  const definition = getWidgetDefinition(widget.type);
  const compact = widget.config.cardSize === "half";
  const href = !editing && widget.config.linkToDevice ? deviceHref(widget) : undefined;

  const content = <WidgetDisplay widget={widget} compact={compact} />;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="w-full min-w-[240px] flex-1 rounded-xl border border-border bg-surface-1 shadow-sm sm:w-72 sm:flex-none"
    >
      {editing && (
        <div className="flex items-center justify-between border-b border-border px-3 py-1.5">
          <button
            type="button"
            aria-label="Drag to reorder widget"
            className="cursor-grab touch-none text-muted active:cursor-grabbing"
            {...attributes}
            {...listeners}
          >
            <GripIcon />
          </button>
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="Configure widget"
              onClick={() => setConfiguring(true)}
              className="rounded p-1 text-muted hover:bg-surface-3 hover:text-foreground"
            >
              <PencilIcon />
            </button>
            <button
              type="button"
              aria-label="Delete widget"
              onClick={onDelete}
              className="rounded p-1 text-muted hover:bg-red-500/10 hover:text-red-400"
            >
              <TrashIcon />
            </button>
          </div>
        </div>
      )}

      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="block transition hover:opacity-80"
          title={`Open ${definition.name}`}
        >
          {content}
        </a>
      ) : (
        content
      )}

      {configuring && widget.type === "tempest-weather" && (
        <TempestConfigModal
          widgetId={widget.id}
          initial={widget.config}
          onSave={(config) => {
            onUpdate({ ...widget, config });
            setConfiguring(false);
          }}
          onClose={() => setConfiguring(false)}
        />
      )}

      {configuring && widget.type !== "tempest-weather" && (
        <GenericWidgetConfigModal
          definition={definition}
          widgetId={widget.id}
          initialConfig={widget.config}
          onSave={(config) => {
            onUpdate({ ...widget, config } as Widget);
            setConfiguring(false);
          }}
          onClose={() => setConfiguring(false)}
        />
      )}
    </div>
  );
}

function GripIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <circle cx="5" cy="3" r="1.3" />
      <circle cx="11" cy="3" r="1.3" />
      <circle cx="5" cy="8" r="1.3" />
      <circle cx="11" cy="8" r="1.3" />
      <circle cx="5" cy="13" r="1.3" />
      <circle cx="11" cy="13" r="1.3" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    </svg>
  );
}
