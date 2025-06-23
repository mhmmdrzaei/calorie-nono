// app/api/nutrition/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { query } = await req.json();
  const res = await fetch(
    "https://trackapi.nutritionix.com/v2/natural/nutrients",
    {
      method: "POST",
      headers: {
        "x-app-id": process.env.NX_APP_ID!,
        "x-app-key": process.env.NX_API_KEY!,
        "x-remote-user-id": "0",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
    }
  );
  if (!res.ok) {
    return NextResponse.json({ error: "Nutritionix error" }, { status: 500 });
  }
  const data = await res.json();
  return NextResponse.json(data);
}
