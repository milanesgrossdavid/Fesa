/**
 * Music Search and Download API Service
 * Uses iTunes API for song search (free, no authentication required)
 */

const YOUTUBE_MUSIC_API = 'https://music.youtube.com';

export interface SpotifyTrack {
  id: string;
  url: string;
  title: string;
  author?: string;
  thumbnail?: string;
  duration?: string;
  audioPreview?: string;
  downloadUrl?: string;
  quality?: string;
  source: 'jiosaavn' | 'youtube';
}

export interface JioMusicResponse {
  results?: Array<{
    id?: string;
    title?: string;
    description?: string;
    image?: string;
    downloadUrl?: string;
    url?: string;
    duration?: number;
    artists?: Array<{
      name?: string;
    }>;
    permaUrl?: string;
  }>;
  error?: string;
}

/**
 * Search for songs using multiple song names (batch search)
 */
export async function batchSearchSongs(
  queries: string[]
): Promise<SpotifyTrack[]> {
  const results: SpotifyTrack[] = [];
  
  for (const query of queries) {
    try {
      const track = await searchSpotifyTrack(query);
      if (track) {
        results.push(track);
      }
    } catch (error) {
      console.error(`Error searching for ${query}:`, error);
    }
  }
  
  return results;
}

/**
 * Search for a song using iTunes API
 * Works with song name, artist name, or combination
 */
export async function searchSpotifyTrack(
  query: string
): Promise<SpotifyTrack | null> {
  try {
    if (!query.trim()) {
      throw new Error('Query cannot be empty');
    }

    console.log(`🔍 Buscando: "${query}"`);

    // Try iTunes first (most reliable)
    console.log('🎵 Intentando iTunes...');
    let result = await searchiTunes(query);
    if (result) {
      console.log('✅ Encontrado en iTunes:', result.title);
      return result;
    }
    console.log('❌ iTunes sin resultados');

    // Fallback to Last.fm
    console.log('🎶 Intentando Last.fm...');
    result = await searchLastFM(query);
    if (result) {
      console.log('✅ Encontrado en Last.fm:', result.title);
      return result;
    }
    console.log('❌ Last.fm sin resultados');

    console.warn(`⚠️ No se encontraron resultados para: ${query}`);
    return null;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Error en búsqueda';
    console.error('❌ Error en searchSpotifyTrack:', errorMessage);
    return null;
  }
}

/**
 * Search using iTunes API (free, no authentication required)
 * Finds songs reliably with metadata
 * NOTE: Downloads are 30-second previews (iTunes limitation)
 * For full songs, users can open in Spotify/Apple Music
 */
async function searchiTunes(query: string): Promise<SpotifyTrack | null> {
  try {
    const encodedQuery = encodeURIComponent(query);
    console.log('Buscando en iTunes:', query);
    
    const response = await fetch(
      `https://itunes.apple.com/search?term=${encodedQuery}&entity=song&limit=5`,
      {
        method: 'GET',
      }
    );

    if (!response.ok) {
      console.warn(`iTunes API error: ${response.status}`);
      return null;
    }

    const data = await response.json();
    const results = data.results || [];

    if (results.length === 0) {
      console.warn('iTunes: No results');
      return null;
    }

    // Find song with preview URL
    const song = results.find((s: any) => s.previewUrl) || results[0];
    
    if (!song) {
      console.warn('iTunes: No valid song found');
      return null;
    }

    console.log('✅ Encontrado:', song.trackName, 'por', song.artistName);

    // iTunes previewUrl is an MP3 file (30-second preview)
    const previewUrl = song.previewUrl;

    return {
      id: song.trackId || `itunes_${Date.now()}`,
      url: song.trackViewUrl || `https://music.apple.com/search?term=${encodedQuery}`,
      title: song.trackName || query,
      author: song.artistName || 'Unknown Artist',
      thumbnail: song.artworkUrl100 || song.artworkUrl60,
      duration: song.trackTimeMillis
        ? formatSeconds(Math.floor(song.trackTimeMillis / 1000))
        : '0:30', // Preview is 30 seconds
      downloadUrl: previewUrl,
      audioPreview: previewUrl,
      source: 'youtube',
    };
  } catch (error) {
    console.error('❌ iTunes error:', error);
    return null;
  }
}

/**
 * Search using Last.fm API (fallback)
 * Provides basic metadata for unknown songs
 */
async function searchLastFM(query: string): Promise<SpotifyTrack | null> {
  try {
    const encodedQuery = encodeURIComponent(query);
    console.log('Last.fm fallback for:', query);
    
    // Return entry with Deezer/YouTube search URLs as fallback
    const deezerSearchUrl = `https://www.deezer.com/search/${encodedQuery}/track`;
    const youtubeSearchUrl = `https://www.youtube.com/results?search_query=${encodedQuery}+song`;
    
    return {
      id: `lastfm_${Date.now()}`,
      url: `https://www.last.fm/search?q=${encodedQuery}&type=track`,
      title: query,
      author: 'Last.fm Search',
      downloadUrl: deezerSearchUrl,
      audioPreview: youtubeSearchUrl,
      source: 'youtube',
    };
  } catch (error) {
    console.error('Last.fm search error:', error);
    return null;
  }
}

function formatSeconds(seconds: number): string {
  if (!seconds || seconds <= 0) return '0:00';
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

/**
 * Get audio download URL for a track
 * Prefers direct audio downloads, falls back to search links if needed
 */
export function getAudioDownloadUrl(track: SpotifyTrack): string {
  // Priority 1: Direct download/preview URL (must be actual audio file)
  if (track.downloadUrl && isValidAudioUrl(track.downloadUrl)) {
    console.log('📥 Using downloadUrl:', track.downloadUrl);
    return track.downloadUrl;
  }

  // Priority 2: Audio preview URL
  if (track.audioPreview && isValidAudioUrl(track.audioPreview)) {
    console.log('📥 Using audioPreview:', track.audioPreview);
    return track.audioPreview;
  }

  // Priority 3: Return search URLs (will open in browser)
  if (track.title && track.author) {
    const searchQuery = encodeURIComponent(`${track.title} ${track.author}`);
    const deezerUrl = `https://www.deezer.com/search/${searchQuery}`;
    console.log('🔍 Returning search URL:', deezerUrl);
    return deezerUrl;
  }

  throw new Error('No audio URL available for this track');
}

/**
 * Check if URL is a valid audio file
 */
function isValidAudioUrl(url: string): boolean {
  // Check for audio file extensions and indicators
  const audioPatterns = [
    /\.mp3$/i,
    /\.m4a$/i,
    /\.wav$/i,
    /\.aac$/i,
    /audio/i,
    /\.mp3\?/i, // mp3 with query params
  ];

  return audioPatterns.some(pattern => pattern.test(url));
}

/**
 * Convert Spotify search query to Spotify URL (requires OAuth - not implemented)
 * This is a placeholder for future implementation with Spotify OAuth
 */
export async function searchAndGetSpotifyUrl(
  query: string
): Promise<string | null> {
  console.warn(
    'Search functionality requires Spotify OAuth integration. Please use direct Spotify URLs.'
  );
  return null;
}

/**
 * Extract track ID from Spotify URL
 */
export function extractTrackIdFromUrl(spotifyUrl: string): string | null {
  const match = spotifyUrl.match(/track\/([a-zA-Z0-9]+)/);
  return match ? match[1] : null;
}

/**
 * Build Spotify URL from track ID
 */
export function buildSpotifyUrl(trackId: string): string {
  return `https://open.spotify.com/track/${trackId}`;
}
