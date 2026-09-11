import { NextRequest, NextResponse } from "next/server";
import { readData, writeData } from "@/lib/store";
import { dashboardDataSchema } from "@/lib/schema";

export async function GET() {
  const data = await readData();
  return NextResponse.json(data);
}

export async function PUT(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = dashboardDataSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid dashboard data", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const saved = await writeData(parsed.data);
  return NextResponse.json(saved);
}
