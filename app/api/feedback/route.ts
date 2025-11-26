import { NextResponse } from "next/server";

export async function POST(req: Request) {
  // 📌 Body vom Browser lesen
  const body = await req.json();

  // 📌 Request an das Backend senden (yjar-chat-api)
  const apiRes = await fetch(
    process.env.NEXT_PUBLIC_CHAT_API_URL + "/api/feedback",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // 🔐 Weitergabe des internen Schlüssels – niemals im Browser sichtbar
        "x-api-key": process.env.INTERNAL_API_KEY || "",
      },
      body: JSON.stringify(body),
    }
  );

  // 📌 Antwort vom Backend zurück an den Browser weiterleiten
  const data = await apiRes.json();
  return NextResponse.json(data, { status: apiRes.status });
}
