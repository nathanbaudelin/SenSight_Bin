import { NextResponse } from "next/server";

import { fetchBackend } from "@/lib/backend-api";

const predictionPath = (id: string) => `/predictions/${encodeURIComponent(id)}`;

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  try {
    const response = await fetchBackend(predictionPath(id));
    const payload = await response
      .json()
      .catch(() => ({ status: "error", message: "invalid_json" }));

    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to fetch predictions";
    return NextResponse.json({ status: "error", message }, { status: 502 });
  }
}
