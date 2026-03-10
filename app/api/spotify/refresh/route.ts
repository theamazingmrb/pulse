import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const refreshToken = searchParams.get("refresh_token");

  if (!refreshToken) {
    return NextResponse.json({ error: "No refresh token provided" }, { status: 400 });
  }

  try {
    const tokenResponse = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString("base64")}`,
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error("Failed to refresh token");
    }

    const tokenData = await tokenResponse.json();
    return NextResponse.json(tokenData);
  } catch (err) {
    console.error("Token refresh error:", err);
    return NextResponse.json({ error: "Failed to refresh token" }, { status: 500 });
  }
}
