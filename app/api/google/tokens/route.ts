import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// GET - Retrieve Google connection status and tokens for a user
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accessToken = authHeader.substring(7);
  
  // Use service role to get user from access token
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  // Verify the access token and get user
  const authClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const { data: { user }, error: authError } = await authClient.auth.getUser(accessToken);
  
  if (authError || !user) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  // Get profile with Google tokens
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("google_refresh_token, google_connected_at, google_email")
    .eq("id", user.id)
    .single();

  if (error) {
    console.error("Error fetching profile:", error);
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
  }

  return NextResponse.json({
    connected: !!profile?.google_refresh_token,
    connectedAt: profile?.google_connected_at,
    email: profile?.google_email,
  });
}

// POST - Store Google tokens after OAuth callback
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

  // Use service role to get user from access token
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  // Verify the access token and get user
  const authClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const { data: { user }, error: authError } = await authClient.auth.getUser(accessToken);
  
  if (authError || !user) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  // Update profile with Google tokens
  const { error } = await supabase
    .from("profiles")
    .upsert({
      id: user.id,
      google_refresh_token: refresh_token,
      google_connected_at: new Date().toISOString(),
      google_email: email || null,
    });

  if (error) {
    console.error("Error storing Google tokens:", error);
    return NextResponse.json({ error: "Failed to store tokens" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

// DELETE - Disconnect Google Calendar
export async function DELETE(req: NextRequest) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accessToken = authHeader.substring(7);

  // Use service role to get user from access token
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  // Verify the access token and get user
  const authClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const { data: { user }, error: authError } = await authClient.auth.getUser(accessToken);
  
  if (authError || !user) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  // Remove Google tokens from profile
  const { error } = await supabase
    .from("profiles")
    .update({
      google_refresh_token: null,
      google_connected_at: null,
      google_email: null,
    })
    .eq("id", user.id);

  if (error) {
    console.error("Error removing Google tokens:", error);
    return NextResponse.json({ error: "Failed to disconnect" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}