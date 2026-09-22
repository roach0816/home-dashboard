"use client";

import type { Widget } from "@/lib/types";
import type { SportsGameData, MlbLiveDetail } from "@/lib/integrations/sports";
import { useWidgetData } from "@/lib/widgets/useWidgetData";
import { WidgetFrame, WidgetLoading, WidgetError, StatusLine, type DataSource } from "../primitives";

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

const INNING_ARROW: Record<MlbLiveDetail["inningHalf"], string> = { top: "▲", bottom: "▼", mid: "◆", end: "◆" };
const INNING_WORD: Record<MlbLiveDetail["inningHalf"], string> = { top: "Top", bottom: "Bot", mid: "Mid", end: "End" };

function inningLabel(live: MlbLiveDetail): string {
  return `${INNING_WORD[live.inningHalf]} ${ordinal(live.inningNumber)}`;
}

/**
 * A rotated square has a bounding box of side*sqrt(2) — sizing r (the
 * diamond's radius) and baseSize together so a base marker's corners never
 * overshoot the SVG's own canvas, which is what clipped them originally.
 */
function BasesDiamond({ live, size = 46 }: { live: MlbLiveDetail; size?: number }) {
  const c = size / 2;
  const baseSize = size * 0.22;
  const half = baseSize / 2;
  const r = size * 0.3;
  const occupied = "#3b82f6";
  const empty = "#ffffff";
  const stroke = "#9aa1ad";
  function base(cx: number, cy: number, filled: boolean) {
    return (
      <rect
        x={cx - half}
        y={cy - half}
        width={baseSize}
        height={baseSize}
        transform={`rotate(45 ${cx} ${cy})`}
        fill={filled ? occupied : empty}
        stroke={stroke}
        strokeWidth={1.4}
      />
    );
  }
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} overflow="visible" aria-hidden>
      <polygon
        points={`${c},${c - r} ${c + r},${c} ${c},${c + r} ${c - r},${c}`}
        fill="none"
        stroke={stroke}
        strokeWidth={1.6}
      />
      {base(c, c - r, live.onSecond)}
      {base(c + r, c, live.onFirst)}
      {base(c - r, c, live.onThird)}
    </svg>
  );
}

function OutsDots({ outs }: { outs: number }) {
  return (
    <span className="inline-flex items-center gap-1" aria-label={`${outs} out${outs === 1 ? "" : "s"}`}>
      {[0, 1, 2].map((i) => (
        <span key={i} className={`h-1.5 w-1.5 rounded-full ${i < outs ? "bg-red-500" : "bg-border"}`} />
      ))}
    </span>
  );
}

function LiveBadge() {
  return <span className="shrink-0 text-[11px] font-semibold text-emerald-500">● LIVE</span>;
}

function PlayersLine({ live }: { live: MlbLiveDetail }) {
  if (!live.batter && !live.pitcher) return null;
  return (
    <p className="truncate text-[11px] text-muted">
      {live.batter && (
        <>
          Batting: <span className="font-medium text-foreground">{live.batter}</span>
        </>
      )}
      {live.batter && live.pitcher && " · "}
      {live.pitcher && (
        <>
          Pitching: <span className="font-medium text-foreground">{live.pitcher}</span>
        </>
      )}
    </p>
  );
}

/** Full-card live baseball layout — R/H/E table + diamond, then inning/outs/count, then who's up. */
function MlbLiveFull({ live }: { live: MlbLiveDetail }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <table className="text-xs">
          <thead>
            <tr className="text-[10px] text-muted">
              <th />
              <th className="w-5 font-normal">R</th>
              <th className="w-5 font-normal">H</th>
              <th className="w-5 font-normal">E</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="pr-1.5 text-left font-semibold text-foreground">{live.awayAbbr}</td>
              <td className="text-center font-bold text-foreground">{live.awayRuns}</td>
              <td className="text-center text-muted">{live.awayHits}</td>
              <td className="text-center text-muted">{live.awayErrors}</td>
            </tr>
            <tr>
              <td className="pr-1.5 text-left font-semibold text-foreground">{live.homeAbbr}</td>
              <td className="text-center font-bold text-foreground">{live.homeRuns}</td>
              <td className="text-center text-muted">{live.homeHits}</td>
              <td className="text-center text-muted">{live.homeErrors}</td>
            </tr>
          </tbody>
        </table>
        <BasesDiamond live={live} size={46} />
      </div>
      <div className="border-t border-border pt-1.5">
        <div className="flex items-center gap-3 text-xs text-foreground">
          <span>
            {INNING_ARROW[live.inningHalf]} <span className="font-medium">{inningLabel(live)}</span>
          </span>
          <span className="flex items-center gap-1">
            <OutsDots outs={live.outs} />
            <span className="text-muted">{live.outs} Out</span>
          </span>
          <span className="text-muted">
            {live.balls}–{live.strikes}
          </span>
        </div>
      </div>
      <PlayersLine live={live} />
    </div>
  );
}

/** Half-card live baseball layout — big score line, then one compact situation row. */
function MlbLiveHalf({ live }: { live: MlbLiveDetail }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="text-lg font-bold text-foreground">
        {live.awayAbbr} {live.awayRuns} <span className="font-normal text-muted">–</span> {live.homeRuns} {live.homeAbbr}
      </div>
      <div className="flex items-center gap-2.5 text-[11px] text-foreground">
        <BasesDiamond live={live} size={20} />
        <span>
          {INNING_ARROW[live.inningHalf]} {ordinal(live.inningNumber)}
        </span>
        <OutsDots outs={live.outs} />
        <span className="text-muted">
          {live.balls}–{live.strikes}
        </span>
      </div>
      {(live.batter || live.pitcher) && (
        <p className="truncate text-[11px] text-muted">
          {[live.batter && `${live.batter} batting`, live.pitcher && `${live.pitcher} pitching`].filter(Boolean).join(" · ")}
        </p>
      )}
    </div>
  );
}

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

      {data.mode === "live" && data.mlbLive && (
        <>
          <div className="flex justify-end">
            <LiveBadge />
          </div>
          {compact ? <MlbLiveHalf live={data.mlbLive} /> : <MlbLiveFull live={data.mlbLive} />}
        </>
      )}

      {((data.mode === "live" && !data.mlbLive) || data.mode === "final") && (
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
