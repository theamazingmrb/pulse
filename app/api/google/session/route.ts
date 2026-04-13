import { NextResponse } from "next/server";
import { cookies } from "next/headers";

/**
 * This endpoint reads the temporary OAuth cookie set by the callback
 * and returns the tokens to the client for processing.
 * The cookie is then deleted.
 */
export async function GET() {
  const cookieStore = await cookies();
  const pending = cookieStore.get("google_pending");

  if (!pending) {
    return NextResponse.json({ error: "No pending session" }, { status: 404 });
  }

  try {
    const data = JSON.parse(pending.value);
    
    // Clear the cookie after reading
    const response = NextResponse.json(data);
    response.cookies.delete("google_pending");
    return response;
  } catch {
    return NextResponse.json({ error: "Invalid session data" }, { status: 400 });
  }
}