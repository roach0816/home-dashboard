import { NextResponse } from "next/server";
import { readWidgetSecrets } from "@/lib/store";
import { fetchStations } from "@/lib/tempest";
import { describeError } from "@/lib/integrations/util";

// Lets the Tempest config modal repopulate the station picker for an
// already-configured widget without making the user re-paste their token.
export async function GET(_request: Request, { params }: { params: Promise<{ widgetId: string }> }) {
  const { widgetId } = await params;
  const secrets = await readWidgetSecrets(widgetId);
  if (!secrets.token) {
    return NextResponse.json({ error: "Tempest API token not configured." }, { status: 501 });
  }
  try {
    const stations = await fetchStations(secrets.token);
    return NextResponse.json({ stations });
  } catch (err) {
    return NextResponse.json({ error: describeError(err, "Failed to fetch stations") }, { status: 502 });
  }
}
