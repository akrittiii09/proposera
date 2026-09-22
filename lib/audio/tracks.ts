/**
 * Curated Royalty-Free Ambient Music Library for Proposera.
 * All audio assets are locally bundled and controlled under /public/audio.
 */

export interface AmbientTrack {
  id: string;
  title: string;
  description: string;
  src: string;
  mimeType: string;
}

export const CURATED_TRACKS: AmbientTrack[] = [
  {
    id: "ambient-romance",
    title: "Ambient Romance",
    description: "Gentle harmonic chord progression with soft ambient resonance.",
    src: "/audio/ambient-romance.wav",
    mimeType: "audio/wav",
  },
  {
    id: "gentle-reflection",
    title: "Gentle Reflection",
    description: "Peaceful melodic resonance suited for intimate romantic letters.",
    src: "/audio/gentle-reflection.wav",
    mimeType: "audio/wav",
  },
];

export const DEFAULT_TRACK = CURATED_TRACKS[0];

export function getTrackById(trackId?: string | null): AmbientTrack {
  if (!trackId) return DEFAULT_TRACK;
  const found = CURATED_TRACKS.find((track) => track.id === trackId);
  return found || DEFAULT_TRACK;
}
