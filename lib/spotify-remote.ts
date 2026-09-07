import { SpotifyUser } from "@/types";

// Remote control for the user's ACTIVE Spotify device (e.g. their phone).
// Uses the Spotify Player API (/v1/me/player/...), NOT the Web Playback SDK.
// The Web Playback SDK creates a NEW browser device and steals playback;
// the Player API controls whatever device is already playing.

let cachedToken: string | null = null;
let tokenExpiry = 0;

async function getValidToken(user: SpotifyUser): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiry) return cachedToken;
  try {
    const res = await fetch(
      `/api/spotify/refresh?refresh_token=${encodeURIComponent(user.refreshToken)}`
    );
    if (res.ok) {
      const data = await res.json();
      const fresh: string = data.access_token;
      cachedToken = fresh;
      tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
      return fresh;
    }
  } catch {
    // fall through to the stored access token
  }
  return user.accessToken;
}

export interface RemoteTrack {
  id: string;
  name: string;
  artist: string;
  albumArt: string | null;
  uri: string;
}

export interface RemotePlaybackState {
  isPlaying: boolean;
  track: RemoteTrack | null;
  progressMs: number;
  durationMs: number;
  deviceName: string | null;
}

/**
 * Fetch the current playback state of the user's active device.
 * Returns null when nothing is playing or no device is active.
 */
export async function getRemotePlayback(
  user: SpotifyUser
): Promise<RemotePlaybackState | null> {
  const token = await getValidToken(user);
  const res = await fetch("https://api.spotify.com/v1/me/player", {
    headers: { Authorization: `Bearer ${token}` },
  });
  // 204 = nothing playing, 404 = no active device
  if (res.status === 204 || res.status === 404) return null;
  if (!res.ok) return null;

  const data = await res.json();
  const item = data.item;
  return {
    isPlaying: data.is_playing,
    track: item
      ? {
          id: item.id,
          name: item.name,
          artist:
            item.artists?.map((a: { name: string }) => a.name).join(", ") ?? "",
          albumArt: item.album?.images?.[0]?.url ?? null,
          uri: item.uri,
        }
      : null,
    progressMs: data.progress_ms ?? 0,
    durationMs: item?.duration_ms ?? 0,
    deviceName: data.device?.name ?? null,
  };
}

export async function remotePause(user: SpotifyUser): Promise<boolean> {
  const token = await getValidToken(user);
  const res = await fetch("https://api.spotify.com/v1/me/player/pause", {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.ok;
}

export async function remoteResume(user: SpotifyUser): Promise<boolean> {
  const token = await getValidToken(user);
  const res = await fetch("https://api.spotify.com/v1/me/player/play", {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.ok;
}

export async function remoteNext(user: SpotifyUser): Promise<boolean> {
  const token = await getValidToken(user);
  const res = await fetch("https://api.spotify.com/v1/me/player/next", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.ok;
}

export async function remotePrevious(user: SpotifyUser): Promise<boolean> {
  const token = await getValidToken(user);
  const res = await fetch("https://api.spotify.com/v1/me/player/previous", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.ok;
}

export async function remoteSetVolume(
  user: SpotifyUser,
  volumePercent: number
): Promise<boolean> {
  const token = await getValidToken(user);
  const res = await fetch(
    `https://api.spotify.com/v1/me/player/volume?volume_percent=${volumePercent}`,
    { method: "PUT", headers: { Authorization: `Bearer ${token}` } }
  );
  return res.ok;
}
