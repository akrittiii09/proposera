export type ThemeId =
  | "midnight-velvet"
  | "sunset-terrace"
  | "celestial-rose"
  | "cherry-blossom"
  | "ocean-love"
  | "enchanted-garden"
  | "golden-hour"
  | "lavender-dreams"
  | "cozy-love"
  | "starlit-night"
  | "strawberry-kiss"
  | "cloud-nine"
  | "classic-romance";

export type ColorMoodId =
  | "rose"
  | "red"
  | "pink"
  | "lavender"
  | "purple"
  | "blue"
  | "teal"
  | "green"
  | "peach"
  | "gold";

export interface ColorMoodPalette {
  id: ColorMoodId;
  name: string;
  previewColor: string; // CSS hex/rgb for UI swatches
  accentClass: string;
  btnPrimaryClass: string;
  highlightClass: string;
  borderClass: string;
}

export interface ThemeColors {
  bg: string;
  cardBg: string;
  textPrimary: string;
  textSecondary: string;
  accent: string;
  btnPrimary: string;
  btnSecondary: string;
  borderColor: string;
}

export interface ThemeDecorationConfig {
  icon: string;
  motif: string;
  ambientGlowClass: string;
}

export interface ThemeDefinition {
  id: ThemeId;
  name: string;
  emoji: string;
  moodDescription: string;
  paletteDescription: string;
  representativeAccent: string;
  colors: ThemeColors;
  decorations: ThemeDecorationConfig;
  defaultColorMood: ColorMoodId;
}

export interface ProposalThemeCustomization {
  color_mood?: ColorMoodId | null;
  proposal_emoji?: string | null;
  celebration_emoji?: string | null;
  audio_track_id?: string | null;
  [key: string]: unknown;
}

export interface ResolvedTheme {
  definition: ThemeDefinition;
  colors: ThemeColors;
  colorMood: ColorMoodPalette;
  proposalEmoji: string;
  celebrationEmoji: string;
  decorations: ThemeDecorationConfig;
}

export const CURATED_EMOJI_LIST = [
  "💍",
  "❤️",
  "💕",
  "💖",
  "🥹",
  "🌹",
  "✨",
  "🫶🏻",
  "🧸",
  "🌸",
  "🌙",
  "💫",
  "🦋",
  "🍓",
  "☁️",
  "💐",
  "🥰",
  "💞",
  "⭐",
  "🎀",
] as const;

export type CuratedEmoji = (typeof CURATED_EMOJI_LIST)[number];
