import { NextRequest, NextResponse } from "next/server";
import { searchSpotifyTracks } from "@/lib/spotify";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q");
  if (!q) return NextResponse.json({ tracks: [] });

  try {
    const tracks = await searchSpotifyTracks(q);
    return NextResponse.json({ tracks });
  } catch (err) {
    console.error("Spotify search error:", err);
    return NextResponse.json({ tracks: [], error: "Spotify unavailable" }, { status: 500 });
  }
}
