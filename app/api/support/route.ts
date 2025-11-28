import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    // Request-Body auslesen
    const body = await req.json();

    // Request an das externe Support-API weiterleiten
    const apiRes = await fetch(
      `${process.env.NEXT_PUBLIC_CHAT_API_URL}/api/support`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-internal-api-key": process.env.INTERNAL_API_KEY!,
        },
        body: JSON.stringify(body),
      }
    );

    // Antwort vom Support-API auslesen
    const json = await apiRes.json().catch(() => ({}));

    // Antwort 1:1 an den Client zurückgeben
    return NextResponse.json(json, { status: apiRes.status });
  } catch (error: unknown) {
    // Fehlerbehandlung – sichere Fehlermeldung
    const message =
      error instanceof Error ? error.message : "Unbekannter Fehler";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
