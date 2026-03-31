import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { refresh_token } = await req.json();

  if (!refresh_token) {
    return NextResponse.json({ error: "No refresh token" }, { status: 400 });
  }

  try {
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token,
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error("Failed to refresh token");
    }

    const data = await tokenResponse.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error("Google refresh error:", err);
    return NextResponse.json({ error: "Failed to refresh token" }, { status: 500 });
  }
}
