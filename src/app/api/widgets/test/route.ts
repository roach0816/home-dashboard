import { NextRequest, NextResponse } from "next/server";
import { widgetSchema } from "@/lib/schema";
import { fetchWidgetData } from "@/lib/integrations";
import { describeError } from "@/lib/integrations/util";

// Lets the config form verify a connection before the widget (and its
// secrets) are actually saved. Always returns 200 — success/failure is
// reported in the body so a failed test isn't treated as a server error.
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" });
  }

  const { type, config, secrets } = (body ?? {}) as {
    type?: unknown;
    config?: unknown;
    secrets?: unknown;
  };

  const parsed = widgetSchema.safeParse({ id: "test", type, config });
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid configuration" });
  }

  const secretsRecord =
    secrets && typeof secrets === "object" ? (secrets as Record<string, string>) : {};

  try {
    const data = await fetchWidgetData(parsed.data, secretsRecord);
    return NextResponse.json({ ok: true, data });
  } catch (err) {
    return NextResponse.json({ ok: false, error: describeError(err, "Test failed") });
  }
}
