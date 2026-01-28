import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const ssid = typeof body?.ssid === "string" ? body.ssid : "";

  return NextResponse.json({
    ok: Boolean(ssid),
    ssid,
    connectedAt: new Date().toISOString(),
  });
}
