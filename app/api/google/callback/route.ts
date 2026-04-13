import { NextRequest, NextResponse } from "next/server";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const state = searchParams.get("state");

  if (error) {
    return NextResponse.redirect(`${BASE_URL}/dashboard?google_error=${error}`);
  }
  if (!code) {
    return NextResponse.redirect(`${BASE_URL}/dashboard?google_error=no_code`);
  }
  if (!state) {
    return NextResponse.redirect(`${BASE_URL}/dashboard?google_error=missing_state`);
  }

  try {
    // Exchange code for tokens
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI!,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error("Token exchange failed:", errorData);
      throw new Error("Failed to exchange code for token");
    }

    const tokenData = await tokenResponse.json();

    // Store in a secure cookie for the client to process
    // The client will then save to Supabase with user context
    const cookieValue = JSON.stringify({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_in: tokenData.expires_in,
      state,
      scope: tokenData.scope,
    });

    const response = NextResponse.redirect(`${BASE_URL}/dashboard?google_connected=true`);
    response.cookies.set("google_pending", cookieValue, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60, // 1 minute to process
      path: "/",
    });

    return response;
  } catch (err) {
    console.error("Google callback error:", err);
    return NextResponse.redirect(`${BASE_URL}/dashboard?google_error=callback_failed`);
  }
}