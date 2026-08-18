/**
 * BhariyaMusic API Service
 * Integrates with https://github.com/BhaskarPanja93/BhariyaMusic
 * Provides music search, metadata fetching, and audio downloading
 */

const API_BASE_URL = 'https://bhindi1.ddns.net/music/api';

export interface BhariyaMusicTrack {
  id: string;
  title: string;
  artist?: string;
  duration?: number;
  thumbnail?: string;
  youtubeUrl?: string;
  spotifyUrl?: string;
  audioUrl?: string;
}

export interface SongPrepareResponse {
  success: boolean;
  songId?: string;
  message?: string;
  error?: string;
}

export interface SongFetchResponse {
  success: boolean;
  songId?: string;
  songTitle?: string;
  artist?: string;
  duration?: number;
  thumbnail?: string;
  youtubeUrl?: string;
  spotifyUrl?: string;
  audioUrl?: string;
  message?: string;
  error?: string;
}

/**
 * Prepare a song for downloading by providing its name
 * Returns a song ID that can be used to fetch details
 */
export async function prepareSong(
  songNameOrUrl: string
): Promise<SongPrepareResponse> {
  try {
    const encodedQuery = encodeURIComponent(songNameOrUrl);
    const response = await fetch(
      `${API_BASE_URL}/prepare/${encodedQuery}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(
        `API Error: ${response.status} - ${response.statusText}`
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to prepare song';
    console.error('prepareSong error:', errorMessage);
    return {
      success: false,
      error: errorMessage,
      message: errorMessage,
    };
  }
}

/**
 * Fetch song details by song ID
 * Returns metadata including audio URL, thumbnail, and links to YouTube/Spotify
 */
export async function fetchSongDetails(
  songId: string
): Promise<SongFetchResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/fetch/${songId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(
        `API Error: ${response.status} - ${response.statusText}`
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to fetch song details';
    console.error('fetchSongDetails error:', errorMessage);
    return {
      success: false,
      error: errorMessage,
      message: errorMessage,
    };
  }
}

/**
 * Get audio stream URL by song ID
 * Use this if the default audio URL from fetchSongDetails doesn't work
 */
export async function getAudioStream(songId: string): Promise<string> {
  return `${API_BASE_URL}/audio/${songId}`;
}

/**
 * Search for songs and get download-ready metadata
 * This is the main function to use for searching and preparing songs
 */
export async function searchAndPrepare(
  query: string
): Promise<BhariyaMusicTrack | null> {
  try {
    // Step 1: Prepare the song (get ID)
    const prepareResult = await prepareSong(query);

    if (!prepareResult.success || !prepareResult.songId) {
      throw new Error(
        prepareResult.message ||
          prepareResult.error ||
          'Failed to find song'
      );
    }

    // Step 2: Fetch song details using the ID
    const fetchResult = await fetchSongDetails(prepareResult.songId);

    if (!fetchResult.success) {
      throw new Error(
        fetchResult.message ||
          fetchResult.error ||
          'Failed to fetch song details'
      );
    }

    // Step 3: Construct the track object
    const track: BhariyaMusicTrack = {
      id: prepareResult.songId,
      title: fetchResult.songTitle || 'Unknown Title',
      artist: fetchResult.artist || 'Unknown Artist',
      duration: fetchResult.duration,
      thumbnail: fetchResult.thumbnail,
      youtubeUrl: fetchResult.youtubeUrl,
      spotifyUrl: fetchResult.spotifyUrl,
      audioUrl: fetchResult.audioUrl,
    };

    return track;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Search failed';
    console.error('searchAndPrepare error:', errorMessage);
    return null;
  }
}

/**
 * Get the audio URL for downloading
 * Prioritizes the direct audioUrl, falls back to stream endpoint
 */
export function getAudioDownloadUrl(track: BhariyaMusicTrack): string {
  if (track.audioUrl) {
    return track.audioUrl;
  }
  return getAudioStream(track.id);
}

/**
 * Batch search multiple songs
 */
export async function batchSearch(
  queries: string[]
): Promise<BhariyaMusicTrack[]> {
  const results = await Promise.all(
    queries.map(query => searchAndPrepare(query))
  );
  return results.filter((track): track is BhariyaMusicTrack => track !== null);
}
