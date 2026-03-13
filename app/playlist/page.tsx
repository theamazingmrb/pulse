"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { SpotifyPlaylist } from "@/types";
import { useSpotify } from "@/lib/spotify-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Play, Pause, ExternalLink, Calendar, Music, ChevronRight, RefreshCw } from "lucide-react";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import AuthGuard from "@/components/auth-guard";
import Image from "next/image";
import { SpotifyTrack } from "@/types";

interface JournalTrack {
  id: string;
  journal_id: string;
  journal_date: string;
  journal_title: string | null;
  journal_created_at: string;
  spotify_track_id: string;
  spotify_track_name: string;
  spotify_artist: string;
  spotify_album_art: string | null;
  spotify_preview_url: string | null;
  spotify_url: string;
}

interface TrackWithJournals {
  spotify_track_id: string;
  spotify_track_name: string;
  spotify_artist: string;
  spotify_album_art: string | null;
  spotify_preview_url: string | null;
  spotify_url: string;
  journals: JournalTrack[];
}

export default function PlaylistPage() {
  const { user } = useAuth();
  const { user: spotifyUser } = useSpotify();
  const { currentTrack, isPlaying, playerReady, playTrack, pause } = useSpotify();
  const [tracks, setTracks] = useState<TrackWithJournals[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncedPlaylist, setSyncedPlaylist] = useState<SpotifyPlaylist | null>(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (user) {
      loadPlaylist();
      loadSyncedPlaylist();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function loadPlaylist() {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("journals")
        .select(`
          id,
          date,
          title,
          created_at,
          spotify_track_id,
          spotify_track_name,
          spotify_artist,
          spotify_album_art,
          spotify_preview_url,
          spotify_url
        `)
        .eq("user_id", user.id)
        .not("spotify_track_id", "is", null)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Supabase error loading playlist:", error);
        setLoading(false);
        return;
      }
      
      if (!data || data.length === 0) {
        setTracks([]);
        setLoading(false);
        return;
      }

      // Group tracks by spotify_track_id
      const trackMap = new Map<string, TrackWithJournals>();
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (data || []).forEach((journal: any) => {
        const trackId = journal.spotify_track_id;
        
        if (!trackMap.has(trackId)) {
          trackMap.set(trackId, {
            spotify_track_id: journal.spotify_track_id,
            spotify_track_name: journal.spotify_track_name,
            spotify_artist: journal.spotify_artist,
            spotify_album_art: journal.spotify_album_art,
            spotify_preview_url: journal.spotify_preview_url,
            spotify_url: journal.spotify_url,
            journals: []
          });
        }
        
        trackMap.get(trackId)!.journals.push({
          id: journal.id,
          journal_id: journal.id,
          journal_date: journal.date,
          journal_title: journal.title,
          journal_created_at: journal.created_at,
          spotify_track_id: journal.spotify_track_id,
          spotify_track_name: journal.spotify_track_name,
          spotify_artist: journal.spotify_artist,
          spotify_album_art: journal.spotify_album_art,
          spotify_preview_url: journal.spotify_preview_url,
          spotify_url: journal.spotify_url,
        });
      });

      // Sort by most recent journal entry
      const sortedTracks = Array.from(trackMap.values()).sort((a, b) => {
        const aLatest = Math.max(...a.journals.map(j => new Date(j.journal_created_at).getTime()));
        const bLatest = Math.max(...b.journals.map(j => new Date(j.journal_created_at).getTime()));
        return bLatest - aLatest;
      });

      setTracks(sortedTracks);
      setLoading(false);
    } catch (err) {
      console.error("Error in loadPlaylist:", err);
      setTracks([]);
      setLoading(false);
    }
  }

  async function loadSyncedPlaylist() {
    if (!user) return;
    
    const { data, error } = await supabase
      .from("spotify_playlists")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (data && !error) {
      setSyncedPlaylist(data);
    }
  }

  async function createSpotifyPlaylist() {
    if (!spotifyUser || tracks.length === 0) return;
    
    setSyncing(true);
    try {
      const trackIds = tracks.map(track => track.spotify_track_id);
      
      const response = await fetch("/api/spotify/playlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accessToken: spotifyUser.accessToken,
          trackIds,
          name: "My Journal Playlist",
          description: `Songs from my journal entries - a soundtrack of my thoughts and moments. Created ${new Date().toLocaleDateString()}.`
        })
      });

      const result = await response.json();
      
      if (result.success) {
        // Save to database
        const { data, error } = await supabase
          .from("spotify_playlists")
          .insert({
            user_id: user!.id,
            spotify_id: result.playlist.id,
            name: result.playlist.name,
            description: "Songs from my journal entries",
            external_url: result.playlist.external_url,
            last_synced: new Date().toISOString(),
            track_count: result.playlist.tracks_added
          })
          .select()
          .single();

        if (data && !error) {
          setSyncedPlaylist(data);
        }
      }
    } catch (error) {
      console.error("Failed to create playlist:", error);
    } finally {
      setSyncing(false);
    }
  }

  async function syncWithSpotify() {
    if (!spotifyUser || !syncedPlaylist || tracks.length === 0) return;
    
    setSyncing(true);
    try {
      // Get current track IDs from our playlist
      const currentTrackIds = tracks.map(track => track.spotify_track_id);
      
      const response = await fetch("/api/spotify/playlist", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accessToken: spotifyUser.accessToken,
          playlistId: syncedPlaylist.spotify_id,
          trackIds: currentTrackIds,
          action: "add"
        })
      });

      const result = await response.json();
      
      if (result.success) {
        // Update last synced timestamp
        await supabase
          .from("spotify_playlists")
          .update({ 
            last_synced: new Date().toISOString(),
            track_count: currentTrackIds.length
          })
          .eq("id", syncedPlaylist.id);
          
        loadSyncedPlaylist();
      }
    } catch (error) {
      console.error("Failed to sync playlist:", error);
    } finally {
      setSyncing(false);
    }
  }

  const handlePlayToggle = async (track: TrackWithJournals) => {
    const spotifyTrack: SpotifyTrack = {
      id: track.spotify_track_id,
      name: track.spotify_track_name,
      artist: track.spotify_artist,
      album_art: track.spotify_album_art,
      preview_url: track.spotify_preview_url,
      spotify_url: track.spotify_url,
      uri: `spotify:track:${track.spotify_track_id}`
    };

    if (isPlaying && currentTrack?.id === track.spotify_track_id) {
      await pause();
    } else {
      await playTrack(spotifyTrack);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">Please sign in to view your playlist.</p>
      </div>
    );
  }

  return (
    <AuthGuard>
      <div className="max-w-4xl">
        <div className="mb-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold mb-1">My Journal Playlist</h1>
              <p className="text-muted-foreground text-sm">
                All the songs you&apos;ve attached to your journal entries, organized by when you wrote about them.
              </p>
            </div>
            
            {/* Spotify Sync Controls */}
            {tracks.length > 0 && (
              <div className="flex flex-col gap-2">
                {syncedPlaylist ? (
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={syncWithSpotify}
                      disabled={syncing || !spotifyUser}
                      variant="outline"
                      size="sm"
                      className="gap-2"
                    >
                      <RefreshCw size={14} className={syncing ? "animate-spin" : ""} />
                      {syncing ? "Syncing..." : "Sync Now"}
                    </Button>
                    <a
                      href={syncedPlaylist.external_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-green-600 hover:text-green-700 font-medium flex items-center gap-1"
                    >
                      View on Spotify
                      <ExternalLink size={12} />
                    </a>
                  </div>
                ) : spotifyUser ? (
                  <Button
                    onClick={createSpotifyPlaylist}
                    disabled={syncing}
                    size="sm"
                    className="gap-2 bg-green-600 hover:bg-green-700"
                  >
                    <Music size={14} />
                    {syncing ? "Creating..." : "Create Spotify Playlist"}
                  </Button>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Connect Spotify to create a playlist
                  </p>
                )}
              </div>
            )}
          </div>
          
          {/* Sync Status */}
          {syncedPlaylist && (
            <div className="mt-4 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                Synced with Spotify • {syncedPlaylist.track_count} tracks
                {syncedPlaylist.last_synced && (
                  <> • Last synced {formatDate(syncedPlaylist.last_synced)}</>
                )}
              </span>
            </div>
          )}
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground text-center py-8">Loading playlist...</p>
        ) : tracks.length === 0 ? (
          <Card className="border-dashed">
            <CardContent>
              <div className="text-center py-12">
                <Music size={48} className="mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No songs yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Start attaching songs to your journal entries to build your personal soundtrack.
                </p>
                <Link href="/journal/new">
                  <Button>Write your first entry with music</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {tracks.map((track) => {
              const isCurrentTrack = currentTrack?.id === track.spotify_track_id;
              const isTrackPlaying = isPlaying && isCurrentTrack;
              
              return (
                <Card key={track.spotify_track_id} className="group">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      {/* Album art and play button */}
                      <div className="relative flex-shrink-0">
                        {track.spotify_album_art ? (
                          <Image
                            src={track.spotify_album_art}
                            alt={track.spotify_track_name}
                            width={80}
                            height={80}
                            className="rounded-lg"
                          />
                        ) : (
                          <div className="w-20 h-20 rounded-lg bg-secondary flex items-center justify-center">
                            <Music size={24} className="text-muted-foreground" />
                          </div>
                        )}
                        
                        {playerReady && (
                          <button
                            onClick={() => handlePlayToggle(track)}
                            className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white hover:scale-105 transition-transform">
                              {isTrackPlaying ? (
                                <Pause size={20} fill="currentColor" />
                              ) : (
                                <Play size={20} className="ml-1" fill="currentColor" />
                              )}
                            </div>
                          </button>
                        )}
                      </div>

                      {/* Track info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <h3 className="font-semibold text-base truncate">{track.spotify_track_name}</h3>
                            <p className="text-sm text-muted-foreground truncate">{track.spotify_artist}</p>
                            
                            {/* Journal references */}
                            <div className="mt-3">
                              <p className="text-xs text-muted-foreground mb-2">
                                Featured in {track.journals.length} journal{track.journals.length > 1 ? 's' : ''}:
                              </p>
                              <div className="space-y-1">
                                {track.journals.slice(0, 3).map((journal) => (
                                  <Link
                                    key={journal.id}
                                    href={`/journal/${journal.journal_id}`}
                                    className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors group/journal"
                                  >
                                    <Calendar size={10} />
                                    <span>{formatDate(journal.journal_date)}</span>
                                    {journal.journal_title && (
                                      <>
                                        <span>·</span>
                                        <span className="truncate max-w-[200px]">{journal.journal_title}</span>
                                      </>
                                    )}
                                    <ChevronRight size={10} className="opacity-0 group-hover/journal:opacity-100 transition-opacity" />
                                  </Link>
                                ))}
                                {track.journals.length > 3 && (
                                  <p className="text-xs text-muted-foreground">
                                    +{track.journals.length - 3} more journal{track.journals.length - 3 > 1 ? 's' : ''}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <a
                              href={track.spotify_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-muted-foreground hover:text-foreground transition-colors"
                              title="Open in Spotify"
                            >
                              <ExternalLink size={16} />
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
