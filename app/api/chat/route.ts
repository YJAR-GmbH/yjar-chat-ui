import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json();

  const apiRes = await fetch(process.env.NEXT_PUBLIC_CHAT_API_URL + "/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.INTERNAL_API_KEY || "",
    },
    body: JSON.stringify(body),
  });

  const data = await apiRes.json();
  return NextResponse.json(data, { status: apiRes.status });
}
