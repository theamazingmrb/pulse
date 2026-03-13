import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { accessToken, trackIds, name, description } = await request.json();

    if (!accessToken || !trackIds || !Array.isArray(trackIds)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Create playlist
    const playlistRes = await fetch('https://api.spotify.com/v1/me/playlists', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: name || 'My Journal Playlist',
        description: description || 'Songs from my journal entries - a soundtrack of my thoughts and moments.',
        public: false,
      }),
    });

    if (!playlistRes.ok) {
      const error = await playlistRes.text();
      console.error('Failed to create playlist:', error);
      return NextResponse.json({ error: 'Failed to create playlist' }, { status: 500 });
    }

    const playlist = await playlistRes.json();

    // Add tracks to playlist (Spotify API allows max 100 tracks per request)
    const batchSize = 100;
    for (let i = 0; i < trackIds.length; i += batchSize) {
      const batch = trackIds.slice(i, i + batchSize);
      const uris = batch.map((id: string) => `spotify:track:${id}`);

      const addTracksRes = await fetch(`https://api.spotify.com/v1/playlists/${playlist.id}/tracks`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uris,
        }),
      });

      if (!addTracksRes.ok) {
        const error = await addTracksRes.text();
        console.error('Failed to add tracks:', error);
        // Don't fail the whole operation if one batch fails
      }
    }

    return NextResponse.json({
      success: true,
      playlist: {
        id: playlist.id,
        name: playlist.name,
        external_url: playlist.external_urls.spotify,
        tracks_added: trackIds.length,
      },
    });

  } catch (error) {
    console.error('Playlist creation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { accessToken, playlistId, trackIds, action } = await request.json();

    if (!accessToken || !playlistId || !action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    let result;

    if (action === 'add' && trackIds && Array.isArray(trackIds)) {
      // Add tracks to existing playlist
      const uris = trackIds.map((id: string) => `spotify:track:${id}`);
      
      const addRes = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ uris }),
      });

      if (!addRes.ok) {
        const error = await addRes.text();
        console.error('Failed to add tracks:', error);
        return NextResponse.json({ error: 'Failed to add tracks' }, { status: 500 });
      }

      result = { added: trackIds.length };

    } else if (action === 'remove' && trackIds && Array.isArray(trackIds)) {
      // Remove tracks from playlist
      const tracks = trackIds.map((id: string) => ({ uri: `spotify:track:${id}` }));
      
      const removeRes = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tracks }),
      });

      if (!removeRes.ok) {
        const error = await removeRes.text();
        console.error('Failed to remove tracks:', error);
        return NextResponse.json({ error: 'Failed to remove tracks' }, { status: 500 });
      }

      result = { removed: trackIds.length };

    } else if (action === 'update') {
      // Update playlist details
      const { name, description } = await request.json();
      
      const updateRes = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name || 'My Journal Playlist',
          description: description || 'Songs from my journal entries - a soundtrack of my thoughts and moments.',
        }),
      });

      if (!updateRes.ok) {
        const error = await updateRes.text();
        console.error('Failed to update playlist:', error);
        return NextResponse.json({ error: 'Failed to update playlist' }, { status: 500 });
      }

      result = { updated: true };

    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    return NextResponse.json({ success: true, result });

  } catch (error) {
    console.error('Playlist update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
