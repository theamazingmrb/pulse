"use client";
import { useState, useEffect } from "react";
import { Music, Calendar, Check, X, AlertTriangle, Plus } from "lucide-react";
import { useSpotify } from "@/lib/spotify-context";
import { useAuth } from "@/lib/auth-context";
import { initiateSpotifyAuth } from "@/lib/spotify";
import { isGoogleConnectedAsync, initiateGoogleAuth, GoogleAccount } from "@/lib/google-calendar";

// Consolidates the Spotify + Google Calendar connect prompts into a single
// "Connections" card with status chips, instead of two competing banners.

export default function ConnectionsCard() {
  const { user: spotifyUser } = useSpotify();
  const { user } = useAuth();
  const [gcalAccounts, setGcalAccounts] = useState<GoogleAccount[]>([]);
  const [gcalLoading, setGcalLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    isGoogleConnectedAsync().then((s) => {
      setGcalAccounts(s.accounts);
      setGcalLoading(false);
    });
  }, [user]);

  const spotifyConnected = !!spotifyUser;
  const gcalConnected = gcalAccounts.length > 0;

  // If both are connected, nothing to show
  if (spotifyConnected && gcalConnected) return null;
  if (dismissed) return null;
  if (gcalLoading) return null;

  const connectSpotify = () => {
    setError(null);
    const err = initiateSpotifyAuth();
    if (err) setError(err);
  };

  const connectGcal = () => {
    setError(null);
    const err = initiateGoogleAuth();
    if (err) setError(err);
  };

  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3 mb-6">
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium mb-2">Connect your tools</p>
          <div className="flex flex-wrap gap-2">
            {/* Spotify */}
            {!spotifyConnected ? (
              <button
                onClick={connectSpotify}
                className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-full border border-green-500/30 bg-green-500/5 text-green-700 dark:text-green-300 hover:bg-green-500/10 transition-colors"
              >
                <Music size={12} />
                Connect Spotify
                <Plus size={11} />
              </button>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-full border border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-300">
                <Check size={12} />
                Spotify
              </span>
            )}

            {/* Google Calendar */}
            {!gcalConnected ? (
              <button
                onClick={connectGcal}
                className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-full border border-blue-500/30 bg-blue-500/5 text-blue-700 dark:text-blue-300 hover:bg-blue-500/10 transition-colors"
              >
                <Calendar size={12} />
                Connect Calendar
                <Plus size={11} />
              </button>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300">
                <Check size={12} />
                Calendar · {gcalAccounts.length} {gcalAccounts.length === 1 ? "account" : "accounts"}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded flex-shrink-0"
          title="Dismiss"
        >
          <X size={14} />
        </button>
      </div>
      {error && (
        <div className="flex items-start gap-2 mt-2 text-sm text-destructive">
          <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}
    </div>
  );
}
