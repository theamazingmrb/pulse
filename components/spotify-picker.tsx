"use client";
import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { Search, X, Music, ExternalLink, Play, Pause, LogIn } from "lucide-react";
import { SpotifyTrack } from "@/types";
import { useSpotify } from "@/lib/spotify-context";

interface SpotifyPickerProps {
  value: SpotifyTrack | null;
  onChange: (track: SpotifyTrack | null) => void;
}

export default function SpotifyPicker({ value, onChange }: SpotifyPickerProps) {
  const { user, currentTrack, isPlaying, playerReady, login, logout, playTrack, pause } = useSpotify();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SpotifyTrack[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/spotify/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setResults(data.tracks ?? []);
      } catch { setResults([]); }
      finally { setLoading(false); }
    }, 400);
  }, [query]);

  function selectTrack(track: SpotifyTrack) {
    onChange(track);
    setOpen(false);
    setQuery("");
    setResults([]);
  }

  const handlePlayToggle = async (track: SpotifyTrack) => {
    await playTrack(track);
  };

  const handlePause = async () => {
    await pause();
  };

  if (value) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-border bg-secondary p-3">
        {value.album_art && (
          <Image src={value.album_art} alt={value.name} width={48} height={48} className="rounded" />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{value.name}</p>
          <p className="text-xs text-muted-foreground truncate">{value.artist}</p>
        </div>
        <div className="flex items-center gap-2">
          {user && playerReady && (
            isPlaying && currentTrack?.id === value.id ? (
              <button onClick={handlePause} className="text-green-600 hover:text-green-700 transition-colors" title="Pause">
                <Pause size={16} />
              </button>
            ) : (
              <button onClick={() => handlePlayToggle(value)} className="text-green-600 hover:text-green-700 transition-colors" title="Play">
                <Play size={16} />
              </button>
            )
          )}
          <a href={value.spotify_url} target="_blank" rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground transition-colors">
            <ExternalLink size={14} />
          </a>
          <button onClick={() => onChange(null)} className="text-muted-foreground hover:text-foreground transition-colors">
            <X size={14} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {!open ? (
        <div className="space-y-2">
          {!user ? (
            <button
              type="button"
              onClick={login}
              className="flex items-center gap-2 rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted-foreground hover:border-primary hover:text-foreground transition-colors w-full"
            >
              <LogIn size={16} />
              Connect Spotify to enable playback
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="flex items-center gap-2 rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted-foreground hover:border-primary hover:text-foreground transition-colors w-full"
            >
              <Music size={16} />
              Attach a song to this entry
            </button>
          )}
          {user && (
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Connected as {user.name}</span>
              <button onClick={logout} className="hover:text-foreground transition-colors">Logout</button>
            </div>
          )}
        </div>
      ) : (
        <div>
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              autoFocus
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search Spotify..."
              className="w-full rounded-lg border border-border bg-secondary pl-9 pr-4 py-2.5 text-sm outline-none focus:border-primary placeholder:text-muted-foreground"
            />
            <button onClick={() => { setOpen(false); setQuery(""); setResults([]); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X size={14} />
            </button>
          </div>
          {(loading || results.length > 0) && (
            <div className="mt-1 rounded-lg border border-border bg-card shadow-lg overflow-hidden">
              {loading && (
                <div className="px-4 py-3 text-sm text-muted-foreground">Searching...</div>
              )}
              {results.map((track) => (
                <div
                  key={track.id}
                  onClick={() => selectTrack(track)}
                  className="flex items-center gap-3 w-full px-3 py-2.5 text-left hover:bg-secondary transition-colors cursor-pointer"
                >
                  {track.album_art && (
                    <Image src={track.album_art} alt={track.name} width={36} height={36} className="rounded" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{track.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{track.artist}</p>
                  </div>
                  {user && playerReady && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); playTrack(track); }}
                      className="text-green-600 hover:text-green-700 transition-colors ml-2"
                      title="Play"
                    >
                      <Play size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
