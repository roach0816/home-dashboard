"use client";

import type { Widget } from "@/lib/types";
import type { MlbGameData } from "@/lib/integrations/mlb";
import { useWidgetData } from "@/lib/widgets/useWidgetData";
import { WidgetFrame, WidgetLoading, WidgetError, StatusLine, type DataSource } from "../primitives";
import { mlbTeamLogoUrl } from "@/lib/mlbTeams";

const REFERENCE_TIME_ZONE = "America/New_York";

function ordinal(n: number): string {
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

function sameDay(a: Date, b: Date): boolean {
  const fmt = new Intl.DateTimeFormat("en-US", { timeZone: REFERENCE_TIME_ZONE });
  return fmt.format(a) === fmt.format(b);
}

function formatGameDateTime(iso: string, { withTime }: { withTime: boolean }): string {
  const date = new Date(iso);
  const now = new Date();
  const dayLabel = sameDay(date, now)
    ? "Today"
    : new Intl.DateTimeFormat("en-US", { timeZone: REFERENCE_TIME_ZONE, weekday: "short", month: "numeric", day: "numeric" }).format(
        date,
      );
  if (!withTime) return dayLabel;
  const time = new Intl.DateTimeFormat("en-US", {
    timeZone: REFERENCE_TIME_ZONE,
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
  return `${dayLabel}, ${time}`;
}

export default function MlbTeamDisplay({
  widget,
  compact,
  href,
  sources,
}: {
  widget: Extract<Widget, { type: "mlb-team" }>;
  compact?: boolean;
  href?: string;
  icon?: string;
  sources?: DataSource[];
}) {
  const label = widget.config.label || "MLB Scoreboard";
  const teamLogo = mlbTeamLogoUrl(widget.config.teamId);
  const { data, error } = useWidgetData<MlbGameData>(widget.id, (widget.config.refreshSeconds ?? 60) * 1000);

  if (error) return <WidgetError label={label} error={error} compact={compact} href={href} icon={teamLogo} sources={sources} />;
  if (!data) return <WidgetLoading label={label} compact={compact} href={href} icon={teamLogo} sources={sources} />;

  return (
    <WidgetFrame label={widget.config.label || data.teamName} compact={compact} href={href} icon={teamLogo} sources={sources}>
      {data.mode === "none" && <StatusLine text="No upcoming games scheduled" />}

      {(data.mode === "live" || data.mode === "final") && (
        <>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-semibold text-foreground">
              {data.teamAbbr} {data.teamScore}
            </span>
            <span className="text-sm text-muted">
              {data.opponentScore} {data.opponentAbbr}
            </span>
          </div>
          {data.mode === "live" ? (
            <StatusLine
              text={`● Live — ${data.inningState ?? ""} ${data.inning ? ordinal(data.inning) : ""}`.trim()}
              tone="good"
            />
          ) : (
            <StatusLine text={`Final${data.gameDate ? ` · ${formatGameDateTime(data.gameDate, { withTime: false })}` : ""}`} />
          )}
        </>
      )}

      {data.mode === "upcoming" && (
        <>
          <p className="text-base font-medium text-foreground">
            {data.teamAbbr} {data.isHome ? "vs" : "@"} {data.opponentAbbr}
          </p>
          <StatusLine text={data.gameDate ? `Next: ${formatGameDateTime(data.gameDate, { withTime: true })}` : "Next game TBD"} />
        </>
      )}
    </WidgetFrame>
  );
}
