import { SpotifyTrack, SpotifyUser } from "@/types";

// Spotify authentication state
let spotifyUser: SpotifyUser | null = null;

// Get Spotify user from localStorage
export function getSpotifyUser(): SpotifyUser | null {
  if (typeof window === 'undefined') return null;
  
  if (!spotifyUser) {
    const stored = localStorage.getItem('spotify_user');
    if (stored) {
      spotifyUser = JSON.parse(stored);
    }
  }
  return spotifyUser;
}

// Save Spotify user to localStorage
export function setSpotifyUser(user: SpotifyUser | null): void {
  if (typeof window === 'undefined') return;
  
  spotifyUser = user;
  if (user) {
    localStorage.setItem('spotify_user', JSON.stringify(user));
  } else {
    localStorage.removeItem('spotify_user');
  }
}

// Initiate Spotify OAuth flow
export function initiateSpotifyAuth(): void {
  const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID;
  const redirectUri = process.env.NEXT_PUBLIC_SPOTIFY_REDIRECT_URI;
  const scopes = [
    'user-read-private',
    'user-read-email', 
    'streaming',
    'user-read-playback-state',
    'user-modify-playback-state',
    'user-read-currently-playing',
    // Playlist management permissions
    'playlist-modify-public',
    'playlist-modify-private', 
    'playlist-read-private'
  ].join(' ');
  
  const authUrl = new URL('https://accounts.spotify.com/authorize');
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('client_id', clientId!);
  authUrl.searchParams.set('scope', scopes);
  authUrl.searchParams.set('redirect_uri', redirectUri!);
  authUrl.searchParams.set('state', Math.random().toString(36).substring(7));
  
  window.location.href = authUrl.toString();
}

// Handle OAuth callback from URL params
export function handleSpotifyCallback(): SpotifyUser | null {
  if (typeof window === 'undefined') return null;
  
  const urlParams = new URLSearchParams(window.location.search);
  const accessToken = urlParams.get('access_token');
  const refreshToken = urlParams.get('refresh_token');
  const userId = urlParams.get('user_id');
  const userName = urlParams.get('user_name');
  
  if (accessToken && refreshToken && userId && userName) {
    const user: SpotifyUser = {
      id: userId,
      name: userName,
      accessToken,
      refreshToken
    };
    
    setSpotifyUser(user);
    
    // Clean up URL
    window.history.replaceState({}, document.title, window.location.pathname);
    
    return user;
  }
  
  return null;
}

// Token cache — server-side module-level (resets on cold start, that's fine)
let cachedToken: string | null = null;
let tokenExpiry: number = 0;

export async function getSpotifyToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiry) return cachedToken;

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization:
        "Basic " +
        Buffer.from(
          `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
        ).toString("base64"),
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) throw new Error("Failed to get Spotify token");
  const data = await res.json();
  cachedToken = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
  return cachedToken!;
}

export async function searchSpotifyTracks(query: string): Promise<SpotifyTrack[]> {
  const token = await getSpotifyToken();
  const res = await fetch(
    `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=8`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) throw new Error("Spotify search failed");
  const data = await res.json();

  return data.tracks.items.map((item: SpotifyItem) => ({
    id: item.id,
    name: item.name,
    artist: item.artists.map((a: { name: string }) => a.name).join(", "),
    album_art: item.album.images[1]?.url ?? item.album.images[0]?.url ?? "",
    preview_url: item.preview_url ?? null,
    spotify_url: item.external_urls.spotify,
    uri: item.uri,
  }));
}

interface SpotifyItem {
  id: string;
  name: string;
  artists: { name: string }[];
  album: { images: { url: string }[] };
  preview_url: string | null;
  external_urls: { spotify: string };
  uri: string;
}
