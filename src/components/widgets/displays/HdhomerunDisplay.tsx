"use client";

import type { Widget } from "@/lib/types";
import type { HdhomerunData } from "@/lib/integrations/hdhomerun";
import { useWidgetData } from "@/lib/widgets/useWidgetData";
import { WidgetFrame, WidgetLoading, WidgetError, StatRow } from "../primitives";

export default function HdhomerunDisplay({
  widget,
  compact,
  href,
  icon,
}: {
  widget: Extract<Widget, { type: "hdhomerun" }>;
  compact?: boolean;
  href?: string;
  icon?: string;
}) {
  const label = widget.config.label || "HDHomeRun";
  const { data, error } = useWidgetData<HdhomerunData>(widget.id, (widget.config.refreshSeconds ?? 60) * 1000);

  if (error) return <WidgetError label={label} error={error} compact={compact} href={href} icon={icon} />;
  if (!data) return <WidgetLoading label={label} compact={compact} href={href} icon={icon} />;

  return (
    <WidgetFrame label={label} compact={compact} href={href} icon={icon}>
      <StatRow
        compact={compact}
        items={[
          { value: `${data.tunersInUse}/${data.tunerCount}`, caption: "tuners in use" },
        ]}
      />
      {!compact && data.modelNumber && <p className="text-xs text-muted">{data.modelNumber}</p>}
    </WidgetFrame>
  );
}
