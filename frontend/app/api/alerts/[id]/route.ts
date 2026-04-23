import { NextResponse } from "next/server";

import { fetchBackend } from "@/lib/backend-api";

const alertPath = (id: string) => `/alerts/${encodeURIComponent(id)}`;

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  try {
    const response = await fetchBackend(alertPath(id));
    const payload = await response.json().catch(() => ({ status: "error", message: "invalid_json" }));
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to fetch alert";
    return NextResponse.json({ status: "error", message }, { status: 502 });
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = await request.text();

  try {
    const response = await fetchBackend(alertPath(id), {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body,
    });

    const payload = await response.json().catch(() => ({ status: "error", message: "invalid_json" }));
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update alert";
    return NextResponse.json({ status: "error", message }, { status: 502 });
  }
}
