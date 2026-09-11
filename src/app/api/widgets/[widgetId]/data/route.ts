import { NextResponse } from "next/server";
import { getWidget, readWidgetSecrets } from "@/lib/store";
import { fetchWidgetData } from "@/lib/integrations";
import { describeError } from "@/lib/integrations/util";

export async function GET(_request: Request, { params }: { params: Promise<{ widgetId: string }> }) {
  const { widgetId } = await params;
  const widget = await getWidget(widgetId);
  if (!widget) {
    return NextResponse.json({ error: "Widget not found" }, { status: 404 });
  }

  const secrets = await readWidgetSecrets(widgetId);
  try {
    const data = await fetchWidgetData(widget, secrets);
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: describeError(err, "Failed to load widget data") }, { status: 502 });
  }
}
