import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    // Request-Body auslesen
    const body = await req.json();

    // Request an das externe Chat-API weiterleiten
    const apiRes = await fetch(
      `${process.env.NEXT_PUBLIC_CHAT_API_URL}/api/leads`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-internal-api-key": process.env.INTERNAL_API_KEY!,
        },
        body: JSON.stringify(body),
      }
    );

    const json = await apiRes.json();

    // Antwort vom API 1:1 an den Client zurückgeben
    return NextResponse.json(json, { status: apiRes.status });
  } catch (error: unknown) {
    // Fehlerbehandlung – sichere Fehlermeldung
    const message =
      error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
