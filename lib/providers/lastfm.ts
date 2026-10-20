export type LastFmTrack = { name: string; artist: { '#text': string }; album?: { '#text': string }; date?: { uts: string }; playcount?: string };

export async function fetchLastFmRecentTracks(username: string, apiKey = process.env.LASTFM_API_KEY): Promise<LastFmTrack[]> {
  if (!apiKey) throw new Error('LASTFM_API_KEY is not configured');
  const url = new URL('https://ws.audioscrobbler.com/2.0/');
  url.searchParams.set('method', 'user.getrecenttracks'); url.searchParams.set('user', username); url.searchParams.set('api_key', apiKey); url.searchParams.set('format', 'json'); url.searchParams.set('limit', '200');
  const response = await fetch(url, { next: { revalidate: 900 } });
  if (!response.ok) throw new Error(`Last.fm returned ${response.status}`);
  const payload = await response.json() as { recenttracks?: { track?: LastFmTrack[] } };
  return payload.recenttracks?.track ?? [];
}
