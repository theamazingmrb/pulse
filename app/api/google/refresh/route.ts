import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accessToken = authHeader.substring(7);
  const body = await req.json();
  const accountId = body?.account_id;

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const authClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const { data: { user }, error: authError } = await authClient.auth.getUser(accessToken);

  if (authError || !user) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  // Get the refresh token for the requested account (or the primary one)
  let query = supabase
    .from("google_calendar_accounts")
    .select("id, refresh_token, google_email")
    .eq("user_id", user.id);

  if (accountId) {
    query = query.eq("id", accountId);
  } else {
    query = query.eq("is_primary", true);
  }

  const { data: account, error: accountError } = await query.single();

  if (accountError || !account?.refresh_token) {
    return NextResponse.json({ error: "Google not connected" }, { status: 400 });
  }

  try {
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: account.refresh_token,
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("Token refresh failed:", errorText);

      // If refresh token is invalid, remove the account
      if (tokenResponse.status === 400 || tokenResponse.status === 401) {
        await supabase
          .from("google_calendar_accounts")
          .delete()
          .eq("id", account.id);
        return NextResponse.json({ error: "Token revoked, please reconnect" }, { status: 401 });
      }

      throw new Error("Failed to refresh token");
    }

    const data = await tokenResponse.json();
    return NextResponse.json({ ...data, account_id: account.id, email: account.google_email });
  } catch (err) {
    console.error("Google refresh error:", err);
    return NextResponse.json({ error: "Failed to refresh token" }, { status: 500 });
  }
}
