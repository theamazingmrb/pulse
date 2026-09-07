import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// GET - Retrieve all connected Google accounts for a user
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accessToken = authHeader.substring(7);

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const authClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const { data: { user }, error: authError } = await authClient.auth.getUser(accessToken);

  if (authError || !user) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  const { data: accounts, error } = await supabase
    .from("google_calendar_accounts")
    .select("id, google_email, connected_at, is_primary")
    .eq("user_id", user.id)
    .order("connected_at", { ascending: true });

  if (error) {
    console.error("Error fetching google accounts:", error);
    return NextResponse.json({ error: "Failed to fetch accounts" }, { status: 500 });
  }

  return NextResponse.json({
    connected: (accounts?.length ?? 0) > 0,
    accounts: accounts ?? [],
  });
}

// POST - Store a new Google account after OAuth callback
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accessToken = authHeader.substring(7);
  const body = await req.json();
  const { refresh_token, email } = body;

  if (!refresh_token) {
    return NextResponse.json({ error: "Missing refresh_token" }, { status: 400 });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const authClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const { data: { user }, error: authError } = await authClient.auth.getUser(accessToken);

  if (authError || !user) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  // Count existing accounts to decide is_primary
  const { count } = await supabase
    .from("google_calendar_accounts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  const isPrimary = (count ?? 0) === 0;

  const { error } = await supabase
    .from("google_calendar_accounts")
    .upsert({
      user_id: user.id,
      google_email: email || "unknown",
      refresh_token,
      connected_at: new Date().toISOString(),
      is_primary: isPrimary,
    }, { onConflict: "user_id,google_email" });

  if (error) {
    console.error("Error storing google account:", error);
    return NextResponse.json({ error: "Failed to store account" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

// DELETE - Disconnect a specific Google account (or all if no id given)
export async function DELETE(req: NextRequest) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accessToken = authHeader.substring(7);
  const accountId = req.nextUrl.searchParams.get("id");

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const authClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const { data: { user }, error: authError } = await authClient.auth.getUser(accessToken);

  if (authError || !user) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  let query = supabase
    .from("google_calendar_accounts")
    .delete()
    .eq("user_id", user.id);

  if (accountId) {
    query = query.eq("id", accountId);
  }

  const { error } = await query;

  if (error) {
    console.error("Error removing google account:", error);
    return NextResponse.json({ error: "Failed to disconnect" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
