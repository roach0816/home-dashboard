import { NextRequest, NextResponse } from "next/server";
import { fetchStations } from "@/lib/tempest";
import { describeError } from "@/lib/integrations/util";

// Special-cased (not routed through the generic widget system) because it's
// used while composing a new Tempest widget, before it — or its token —
// has been saved anywhere.
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const token = (body as { token?: unknown })?.token;
  if (typeof token !== "string" || !token) {
    return NextResponse.json({ error: "Token required" }, { status: 400 });
  }

  try {
    const stations = await fetchStations(token);
    return NextResponse.json({ stations });
  } catch (err) {
    return NextResponse.json({ error: describeError(err, "Failed to fetch Tempest stations") }, { status: 502 });
  }
}
