"use client";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { SpotifyUser, SpotifyTrack } from "@/types";
import { getSpotifyUser, setSpotifyUser, initiateSpotifyAuth, handleSpotifyCallback } from "@/lib/spotify";
import { SpotifyPlayer } from "@/lib/spotify-player";

interface SpotifyContextValue {
  user: SpotifyUser | null;
  currentTrack: SpotifyTrack | null;
  isPlaying: boolean;
  playerReady: boolean;
  login: () => void;
  logout: () => void;
  playTrack: (track: SpotifyTrack) => Promise<void>;
  pause: () => Promise<void>;
}

const SpotifyContext = createContext<SpotifyContextValue | null>(null);

export function useSpotify() {
  const ctx = useContext(SpotifyContext);
  if (!ctx) throw new Error("useSpotify must be used within SpotifyProvider");
  return ctx;
}

export function SpotifyProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SpotifyUser | null>(null);
  const [currentTrack, setCurrentTrack] = useState<SpotifyTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);
  const playerRef = useRef<SpotifyPlayer | null>(null);

  useEffect(() => {
    const callbackUser = handleSpotifyCallback();
    const activeUser = callbackUser ?? getSpotifyUser();
    if (activeUser) {
      setUser(activeUser);
      initPlayer(activeUser);
    }
  }, []);

  const initPlayer = async (spotifyUser: SpotifyUser) => {
    if (playerRef.current) return;
    playerRef.current = new SpotifyPlayer(spotifyUser);
    try {
      await playerRef.current.initialize();
      setPlayerReady(true);
    } catch (err) {
      console.error("Failed to initialize Spotify player:", err);
      playerRef.current = null;
    }
  };

  const login = () => initiateSpotifyAuth();

  const logout = () => {
    playerRef.current?.disconnect();
    playerRef.current = null;
    setSpotifyUser(null);
    setUser(null);
    setPlayerReady(false);
    setIsPlaying(false);
    setCurrentTrack(null);
  };

  const playTrack = async (track: SpotifyTrack) => {
    if (!playerRef.current) return;
    if (isPlaying && currentTrack?.id === track.id) {
      await playerRef.current.pause();
      setIsPlaying(false);
    } else {
      await playerRef.current.playTrack(track.uri);
      setIsPlaying(true);
      setCurrentTrack(track);
    }
  };

  const pause = async () => {
    if (!playerRef.current) return;
    await playerRef.current.pause();
    setIsPlaying(false);
  };

  return (
    <SpotifyContext.Provider value={{ user, currentTrack, isPlaying, playerReady, login, logout, playTrack, pause }}>
      {children}
    </SpotifyContext.Provider>
  );
}
