"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Play, Pause, SkipForward, SkipBack, Volume2, Music } from "lucide-react";
import { useSpotify } from "@/lib/spotify-context";
import {
  getRemotePlayback,
  remotePause,
  remoteResume,
  remoteNext,
  remotePrevious,
  remoteSetVolume,
  RemotePlaybackState,
} from "@/lib/spotify-remote";

// Persistent remote control for the user's ACTIVE Spotify device (e.g. their
// phone). Polls the Player API so it reflects whatever is playing on the phone
// without hijacking playback (unlike the Web Playback SDK).

const POLL_MS = 3000;

export default function SpotifyRemoteController() {
  const { user } = useSpotify();
  const [state, setState] = useState<RemotePlaybackState | null>(null);
  const [volume, setVolume] = useState(50);
  const [busy, setBusy] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!user) {
      setState(null);
      return;
    }

    const poll = async () => {
      const s = await getRemotePlayback(user);
      setState(s);
    };
    poll();
    timerRef.current = setInterval(poll, POLL_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [user]);

  if (!user || !state?.track) return null;

  const toggle = async () => {
    if (busy) return;
    setBusy(true);
    if (state.isPlaying) {
      await remotePause(user);
      setState({ ...state, isPlaying: false });
    } else {
      await remoteResume(user);
      setState({ ...state, isPlaying: true });
    }
    setBusy(false);
  };

  const next = async () => {
    if (busy) return;
    setBusy(true);
    await remoteNext(user);
    setBusy(false);
  };

  const prev = async () => {
    if (busy) return;
    setBusy(true);
    await remotePrevious(user);
    setBusy(false);
  };

  const changeVolume = async (v: number) => {
    setVolume(v);
    await remoteSetVolume(user, v);
  };

  return (
    <div className="fixed bottom-20 md:bottom-4 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-md">
      <div className="rounded-2xl border border-border bg-card/95 backdrop-blur-md shadow-xl px-4 py-3 flex items-center gap-3">
        {state.track.albumArt ? (
          <Image
            src={state.track.albumArt}
            alt={state.track.name}
            width={44}
            height={44}
            className="rounded-lg flex-shrink-0"
          />
        ) : (
          <div className="w-11 h-11 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
            <Music size={20} className="text-muted-foreground" />
          </div>
        )}

        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate">{state.track.name}</p>
          <p className="text-xs text-muted-foreground truncate">
            {state.track.artist}
            {state.deviceName ? ` · ${state.deviceName}` : ""}
          </p>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={prev}
            disabled={busy}
            className="p-2 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            title="Previous"
          >
            <SkipBack size={18} />
          </button>
          <button
            onClick={toggle}
            disabled={busy}
            className="w-10 h-10 rounded-full bg-green-600 hover:bg-green-700 text-white flex items-center justify-center transition-colors disabled:opacity-50"
            title={state.isPlaying ? "Pause" : "Play"}
          >
            {state.isPlaying ? (
              <Pause size={18} fill="currentColor" />
            ) : (
              <Play size={18} className="ml-0.5" fill="currentColor" />
            )}
          </button>
          <button
            onClick={next}
            disabled={busy}
            className="p-2 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            title="Next"
          >
            <SkipForward size={18} />
          </button>
        </div>

        <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
          <Volume2 size={16} className="text-muted-foreground" />
          <input
            type="range"
            min={0}
            max={100}
            value={volume}
            onChange={(e) => changeVolume(Number(e.target.value))}
            className="w-20 accent-green-600"
            title="Volume"
          />
        </div>
      </div>
    </div>
  );
}
