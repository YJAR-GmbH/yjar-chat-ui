// app/api/history/route.ts (yjar-chat-ui)
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const apiRes = await fetch(
      process.env.NEXT_PUBLIC_CHAT_API_URL + "/api/history",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.INTERNAL_API_KEY || "",
        },
        body: JSON.stringify(body),
      }
    );

    let data: unknown;

    try {
      data = await apiRes.json();
    } catch {
      
      const text = await apiRes.text();
      console.error("Upstream /api/history returned non-JSON:", text);
      return NextResponse.json(
        { error: "Upstream history error", details: text },
        { status: 500 }
      );
    }

    return NextResponse.json(data, { status: apiRes.status });
  } catch (err) {
    console.error("Error in frontend /api/history:", err);
    return NextResponse.json(
      { error: "Unexpected error in history proxy" },
      { status: 500 }
    );
  }
}
