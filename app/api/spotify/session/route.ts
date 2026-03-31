import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  const cookieStore = await cookies();
  const pending = cookieStore.get("spotify_pending");

  if (!pending) {
    return NextResponse.json({ error: "No pending session" }, { status: 404 });
  }

  const response = NextResponse.json(JSON.parse(pending.value));
  response.cookies.delete("spotify_pending");
  return response;
}
