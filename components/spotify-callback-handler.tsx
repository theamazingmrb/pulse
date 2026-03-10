"use client";
import { useEffect } from "react";
import { handleSpotifyCallback } from "@/lib/spotify";

export default function SpotifyCallbackHandler() {
  useEffect(() => {
    handleSpotifyCallback();
  }, []);

  return null;
}
