import { NextRequest, NextResponse } from "next/server";
import { widgetSecretsStatus, writeWidgetSecrets, deleteWidgetSecrets } from "@/lib/store";
import { widgetSecretsBodySchema } from "@/lib/schema";

// Status-only: secret values are never sent back to the browser once saved.
export async function GET(_request: NextRequest, { params }: { params: Promise<{ widgetId: string }> }) {
  const { widgetId } = await params;
  const status = await widgetSecretsStatus(widgetId);
  return NextResponse.json({ status });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ widgetId: string }> }) {
  const { widgetId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = widgetSecretsBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const status = await writeWidgetSecrets(widgetId, parsed.data.secrets);
  return NextResponse.json({ status });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ widgetId: string }> }) {
  const { widgetId } = await params;
  await deleteWidgetSecrets(widgetId);
  return NextResponse.json({ ok: true });
}
