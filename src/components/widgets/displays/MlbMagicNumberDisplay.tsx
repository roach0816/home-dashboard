"use client";

import type { Widget } from "@/lib/types";
import type { MlbMagicNumberData } from "@/lib/integrations/mlbMagicNumber";
import { useWidgetData } from "@/lib/widgets/useWidgetData";
import { WidgetFrame, WidgetLoading, WidgetError, type DataSource } from "../primitives";

function formatOpenerDate(iso: string | undefined): string | undefined {
  if (!iso) return undefined;
  return new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", month: "long", day: "numeric", year: "numeric" }).format(
    new Date(iso),
  );
}

function InSeasonBody({ data }: { data: MlbMagicNumberData }) {
  const divisionNum = data.divisionMagicNumber ?? null;
  const wildCardNum = data.wildCardMagicNumber ?? null;

  let heroText: string;
  let heroSub: string | undefined;
  let heroIsChampion = false;
  let showTrophy = false;

  if (data.eliminated) {
    heroText = "Eliminated";
    heroSub = "Out of playoff contention this season";
  } else if (data.divisionClinched) {
    heroText = `${data.divisionName} Champions`;
    heroSub = undefined;
    heroIsChampion = true;
    showTrophy = true;
  } else if (data.wildCardClinched) {
    heroText = "Clinched a Wild Card Spot";
    heroSub = data.divisionName ? `Could still win ${data.divisionName}` : undefined;
    heroIsChampion = true;
  } else if (divisionNum !== null && wildCardNum !== null) {
    const divisionIsSmaller = divisionNum <= wildCardNum;
    heroText = String(divisionIsSmaller ? divisionNum : wildCardNum);
    heroSub = `to clinch ${divisionIsSmaller ? data.divisionName : "a Wild Card spot"}`;
  } else if (divisionNum !== null) {
    heroText = String(divisionNum);
    heroSub = `to clinch ${data.divisionName}`;
  } else if (wildCardNum !== null) {
    heroText = String(wildCardNum);
    heroSub = "to clinch a Wild Card spot";
  } else {
    heroText = "—";
    heroSub = "Magic number unavailable";
  }

  const showDivisionSecondary = !data.eliminated && !data.divisionClinched && divisionNum !== null && (data.wildCardClinched || wildCardNum !== null);
  const showWildCardSecondary = !data.eliminated && !data.wildCardClinched && wildCardNum !== null && !data.divisionClinched && divisionNum !== null;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-xs text-muted">
        <span>
          {data.standingText} · <span className="font-semibold text-foreground">{data.record}</span>
        </span>
        {data.streak && <span>{data.streak}</span>}
      </div>
      <div className="flex flex-col items-center gap-0.5 py-1 text-center">
        {showTrophy && (
          <span className="text-xl" aria-hidden>
            🏆
          </span>
        )}
        <span className={`text-2xl font-extrabold ${heroIsChampion ? "text-accent" : data.eliminated ? "text-muted" : "text-accent"}`}>
          {heroText}
        </span>
        {!heroIsChampion && !data.eliminated && (
          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted">Magic Number</span>
        )}
        {heroSub && <span className="text-[11px] text-muted">{heroSub}</span>}
      </div>
      {(showDivisionSecondary || showWildCardSecondary) && (
        <div className="flex items-center justify-between border-t border-border pt-1.5 text-xs">
          <span className="text-muted">{showDivisionSecondary ? data.divisionName : "Wild Card"} magic number</span>
          <span className="font-bold text-foreground">{showDivisionSecondary ? divisionNum : wildCardNum}</span>
        </div>
      )}
    </div>
  );
}

function RecapBody({ data }: { data: MlbMagicNumberData }) {
  const isChampion = data.headlineTier === "division" || data.headlineTier === "league" || data.headlineTier === "world-series";
  const opener = formatOpenerDate(data.nextSeasonOpener);
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-col items-center gap-0.5 py-1 text-center">
        {isChampion && (
          <span className="text-xl" aria-hidden>
            🏆
          </span>
        )}
        <span className={`text-base font-extrabold ${isChampion ? "text-accent" : "text-foreground"}`}>{data.headlineText}</span>
        {data.contextText && <span className="text-[11px] text-muted">{data.contextText}</span>}
      </div>
      {data.record && (
        <div className="flex items-center justify-between border-t border-border pt-1.5 text-xs">
          <span className="text-muted">Final record</span>
          <span className="font-bold text-foreground">{data.record}</span>
        </div>
      )}
      {opener && <p className="text-center text-[10px] text-muted">Next season opens {opener}</p>}
    </div>
  );
}

export default function MlbMagicNumberDisplay({
  widget,
  compact,
  icon,
  sources,
}: {
  widget: Extract<Widget, { type: "mlb-magic-number" }>;
  compact?: boolean;
  href?: string;
  icon?: string;
  sources?: DataSource[];
}) {
  const label = widget.config.label || "MLB Magic Number";
  const { data, error } = useWidgetData<MlbMagicNumberData>(widget.id, (widget.config.refreshSeconds ?? 300) * 1000);

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
      {data.mode === "in-season" ? <InSeasonBody data={data} /> : <RecapBody data={data} />}
    </WidgetFrame>
  );
}
