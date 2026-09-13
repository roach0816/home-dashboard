import { NextRequest, NextResponse } from "next/server";
import { widgetSchema } from "@/lib/schema";
import { fetchWidgetData } from "@/lib/integrations";
import { describeError } from "@/lib/integrations/util";
import { readWidgetSecrets } from "@/lib/store";

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

  const { type, config, secrets, widgetId } = (body ?? {}) as {
    type?: unknown;
    config?: unknown;
    secrets?: unknown;
    widgetId?: unknown;
  };

  const parsed = widgetSchema.safeParse({ id: "test", type, config });
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid configuration" });
  }

  // The config form only sends drafts for fields the user actually retyped
  // this session — testing an already-configured widget without touching
  // its credential fields would otherwise always fail with "not
  // configured". Fall back to what's already saved for this widget, and
  // let any freshly-typed draft values override it.
  const storedSecrets = typeof widgetId === "string" && widgetId ? await readWidgetSecrets(widgetId) : {};
  const draftSecrets = secrets && typeof secrets === "object" ? (secrets as Record<string, string>) : {};
  const secretsRecord = {
    ...storedSecrets,
    ...Object.fromEntries(Object.entries(draftSecrets).filter(([, v]) => v && v.trim().length > 0)),
  };

  try {
    const data = await fetchWidgetData(parsed.data, secretsRecord);
    return NextResponse.json({ ok: true, data });
  } catch (err) {
    return NextResponse.json({ ok: false, error: describeError(err, "Test failed") });
  }
}
