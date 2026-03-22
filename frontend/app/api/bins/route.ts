import { NextResponse } from "next/server";

import { fetchBackend } from "@/lib/backend-api";

const toQueryString = (request: Request) => {
  const url = new URL(request.url);
  const query = url.searchParams.toString();
  return query ? `?${query}` : "";
};

export async function GET(request: Request) {
  try {
    const response = await fetchBackend(`/bins${toQueryString(request)}`);
    const payload = await response.json().catch(() => ({ status: "error", message: "invalid_json" }));
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to fetch bins";
    return NextResponse.json({ status: "error", message }, { status: 502 });
  }
}

export async function POST(request: Request) {
  const body = await request.text();

  try {
    const response = await fetchBackend("/bins", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body,
    });
    const payload = await response.json().catch(() => ({ status: "error", message: "invalid_json" }));
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create bin";
    return NextResponse.json({ status: "error", message }, { status: 502 });
  }
}
