/**
 * Produced episode media. Empty on purpose: Atlas does not ship fake video files,
 * and the player shows an explicit missing-media state when an episode has no source.
 * Add an entry only after a real, licensed video has been rendered and reviewed.
 */
export const EPISODE_VIDEO_SOURCES: Record<string, string> = {};

export function episodeVideoUrl(id: string): string | undefined {
  return EPISODE_VIDEO_SOURCES[id];
}

export function hasEpisodeVideo(id: string): boolean {
  return Boolean(EPISODE_VIDEO_SOURCES[id]);
}
