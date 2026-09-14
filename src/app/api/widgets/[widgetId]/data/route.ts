import { NextResponse } from "next/server";
import { getWidget } from "@/lib/store";
import { getWidgetData } from "@/lib/widgets/backgroundRefresh";

export async function GET(_request: Request, { params }: { params: Promise<{ widgetId: string }> }) {
  const { widgetId } = await params;
  const widget = await getWidget(widgetId);
  if (!widget) {
    return NextResponse.json({ error: "Widget not found" }, { status: 404 });
  }

  const { data, error } = await getWidgetData(widget);
  if (data === undefined) {
    return NextResponse.json({ error: error ?? "Failed to load widget data" }, { status: 502 });
  }
  return NextResponse.json(data);
}
