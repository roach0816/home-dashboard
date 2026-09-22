"use client";

import type { Widget } from "@/lib/types";
import type { SportsGameData } from "@/lib/integrations/sports";
import { useWidgetData } from "@/lib/widgets/useWidgetData";
import { WidgetFrame, WidgetLoading, WidgetError, StatusLine, type DataSource } from "../primitives";

export default function SportsTeamDisplay({
  widget,
  compact,
  icon,
  sources,
}: {
  widget: Extract<Widget, { type: "sports-team" }>;
  compact?: boolean;
  href?: string;
  icon?: string;
  sources?: DataSource[];
}) {
  const label = widget.config.label || "Sports Scoreboard";
  const { data, error } = useWidgetData<SportsGameData>(widget.id, (widget.config.refreshSeconds ?? 60) * 1000);

  if (error) return <WidgetError label={label} error={error} compact={compact} icon={icon} sources={sources} />;
  if (!data) return <WidgetLoading label={label} compact={compact} icon={icon} sources={sources} />;

  return (
    <WidgetFrame
      label={widget.config.label || data.teamName}
      compact={compact}
      href={data.teamHref}
      icon={data.teamLogo || icon}
      sources={sources}
    >
      {data.mode === "none" && <StatusLine text="No games scheduled" />}

      {(data.mode === "live" || data.mode === "final") && (
        <>
          {data.gameHref ? (
            <a
              href={data.gameHref}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-baseline gap-2 hover:underline"
            >
              <span className="text-xl font-semibold text-foreground">
                {data.teamAbbr} {data.teamScore}
              </span>
              <span className="text-sm text-muted">
                {data.opponentScore} {data.opponentAbbr}
              </span>
            </a>
          ) : (
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-semibold text-foreground">
                {data.teamAbbr} {data.teamScore}
              </span>
              <span className="text-sm text-muted">
                {data.opponentScore} {data.opponentAbbr}
              </span>
            </div>
          )}
          <StatusLine
            text={data.mode === "live" ? `● Live — ${data.statusDetail ?? ""}` : (data.statusDetail ?? "Final")}
            tone={data.mode === "live" ? "good" : "muted"}
          />
        </>
      )}

      {data.mode === "upcoming" && (
        <>
          {data.gameHref ? (
            <a
              href={data.gameHref}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="block text-base font-medium text-foreground hover:underline"
            >
              {data.teamAbbr} {data.isHome ? "vs" : "@"} {data.opponentAbbr}
            </a>
          ) : (
            <p className="text-base font-medium text-foreground">
              {data.teamAbbr} {data.isHome ? "vs" : "@"} {data.opponentAbbr}
            </p>
          )}
          <StatusLine text={data.statusDetail ? `Next: ${data.statusDetail}` : "Next game TBD"} />
        </>
      )}
    </WidgetFrame>
  );
}
