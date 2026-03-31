import { NextRequest, NextResponse } from "next/server";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const state = searchParams.get("state");

  if (error) {
    return NextResponse.redirect(`${BASE_URL}?error=${error}`);
  }

  if (!code) {
    return NextResponse.redirect(`${BASE_URL}?error=no_code`);
  }

  // State is validated client-side (sessionStorage) since the server has no session context here.
  // We pass it through so the client can verify it came back unmodified.
  if (!state) {
    return NextResponse.redirect(`${BASE_URL}?error=missing_state`);
  }

  try {
    const tokenResponse = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString("base64")}`,
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: process.env.SPOTIFY_REDIRECT_URI!,
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error("Failed to exchange code for token");
    }

    const tokenData = await tokenResponse.json();

    const profileResponse = await fetch("https://api.spotify.com/v1/me", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    if (!profileResponse.ok) {
      throw new Error("Failed to get user profile");
    }

    const profile = await profileResponse.json();

    // Store tokens in a short-lived httpOnly cookie — never exposed in URL
    const cookieValue = JSON.stringify({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      user_id: profile.id,
      user_name: profile.display_name,
      state,
    });

    const response = NextResponse.redirect(`${BASE_URL}/?spotify_connected=true`);
    response.cookies.set("spotify_pending", cookieValue, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60, // 1 minute — client picks it up immediately
      path: "/",
    });

    return response;
  } catch (err) {
    console.error("Spotify callback error:", err);
    return NextResponse.redirect(`${BASE_URL}?error=callback_failed`);
  }
}
