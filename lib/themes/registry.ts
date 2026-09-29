import {
  ThemeId,
  ThemeDefinition,
  ResolvedTheme,
  ProposalThemeCustomization,
} from "./types";
import { resolveColorMood, isValidColorMood } from "./colorMoods";

/**
 * All 13 Theme Definitions:
 * - 3 Preserved Themes (Midnight Velvet, Sunset Terrace, Celestial Rose)
 * - 10 New Themes (Cherry Blossom, Ocean Love, Enchanted Garden, Golden Hour,
 *   Lavender Dreams, Cozy Love, Starlit Night, Strawberry Kiss, Cloud Nine, Classic Romance)
 */
export const THEME_REGISTRY: Record<ThemeId, ThemeDefinition> = {
  // -------------------------------------------------------------
  // 1. Midnight Velvet (Preserved 1.0 Default)
  // -------------------------------------------------------------
  "midnight-velvet": {
    id: "midnight-velvet",
    name: "Midnight Velvet",
    emoji: "🍷",
    moodDescription: "Deep nocturnal elegance and intimate cinematic romance",
    paletteDescription: "Obsidian, deep velvet slate, and warm rose accents",
    representativeAccent: "#f43f5e",
    defaultColorMood: "rose",
    colors: {
      bg: "bg-slate-950",
      cardBg: "bg-slate-900/90 border-slate-800",
      textPrimary: "text-slate-100",
      textSecondary: "text-slate-400",
      accent: "text-rose-400",
      btnPrimary: "bg-rose-600 hover:bg-rose-500 text-white shadow-rose-950/50",
      btnSecondary: "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700",
      borderColor: "border-slate-800",
    },
    decorations: {
      icon: "🍷",
      motif: "velvet-glow",
      ambientGlowClass: "from-rose-900/20 via-slate-900/50 to-slate-950",
    },
  },

  // -------------------------------------------------------------
  // 2. Sunset Terrace (Preserved 1.0 Theme)
  // -------------------------------------------------------------
  "sunset-terrace": {
    id: "sunset-terrace",
    name: "Sunset Terrace",
    emoji: "🌅",
    moodDescription: "Warm twilight glow over a golden Mediterranean terrace",
    paletteDescription: "Deep amber, terracotta, honey gold, and warm twilight",
    representativeAccent: "#f59e0b",
    defaultColorMood: "gold",
    colors: {
      bg: "bg-amber-950",
      cardBg: "bg-amber-900/80 border-amber-800/80",
      textPrimary: "text-amber-50",
      textSecondary: "text-amber-300/70",
      accent: "text-amber-400",
      btnPrimary: "bg-amber-600 hover:bg-amber-500 text-amber-950 font-bold shadow-amber-950/50",
      btnSecondary: "bg-amber-900/60 hover:bg-amber-800 text-amber-200 border-amber-800",
      borderColor: "border-amber-800/80",
    },
    decorations: {
      icon: "🌅",
      motif: "golden-dusk",
      ambientGlowClass: "from-amber-800/30 via-amber-950/60 to-stone-950",
    },
  },

  // -------------------------------------------------------------
  // 3. Celestial Rose (Preserved 1.0 Theme)
  // -------------------------------------------------------------
  "celestial-rose": {
    id: "celestial-rose",
    name: "Celestial Rose",
    emoji: "✨",
    moodDescription: "Starlit dusk with shimmering lavender and luminous pink",
    paletteDescription: "Deep royal purple, cosmic indigo, and luminous rose",
    representativeAccent: "#ec4899",
    defaultColorMood: "pink",
    colors: {
      bg: "bg-purple-950",
      cardBg: "bg-purple-900/80 border-purple-800/80",
      textPrimary: "text-purple-50",
      textSecondary: "text-purple-300/80",
      accent: "text-pink-400",
      btnPrimary: "bg-pink-600 hover:bg-pink-500 text-white shadow-pink-950/50",
      btnSecondary: "bg-purple-900 hover:bg-purple-800 text-purple-200 border-purple-800",
      borderColor: "border-purple-800/80",
    },
    decorations: {
      icon: "✨",
      motif: "stardust-aurora",
      ambientGlowClass: "from-purple-900/30 via-indigo-950/50 to-slate-950",
    },
  },

  // -------------------------------------------------------------
  // 4. Cherry Blossom 🌸 (Release 1.1)
  // -------------------------------------------------------------
  "cherry-blossom": {
    id: "cherry-blossom",
    name: "Cherry Blossom",
    emoji: "🌸",
    moodDescription: "Soft, springtime romance bathed in delicate blush petals",
    paletteDescription: "Deep rosewood, cherry petal pink, warm cream, and blush",
    representativeAccent: "#fb7185",
    defaultColorMood: "pink",
    colors: {
      bg: "bg-[#200d14]",
      cardBg: "bg-[#321520]/85 border-[#542435]",
      textPrimary: "text-rose-50",
      textSecondary: "text-rose-200/75",
      accent: "text-rose-300",
      btnPrimary: "bg-rose-500 hover:bg-rose-400 text-white shadow-rose-950/60 font-semibold",
      btnSecondary: "bg-[#3d1927] hover:bg-[#4d2132] text-rose-100 border-[#632b40]",
      borderColor: "border-[#542435]",
    },
    decorations: {
      icon: "🌸",
      motif: "sakura-petals",
      ambientGlowClass: "from-rose-950/40 via-[#200d14]/70 to-[#12070b]",
    },
  },

  // -------------------------------------------------------------
  // 5. Ocean Love 🌊 (Release 1.1)
  // -------------------------------------------------------------
  "ocean-love": {
    id: "ocean-love",
    name: "Ocean Love",
    emoji: "🌊",
    moodDescription: "Dreamy, tranquil twilight tides and bioluminescent calm",
    paletteDescription: "Deep abyss navy, luminous teal, aqua shimmer, and foam white",
    representativeAccent: "#2dd4bf",
    defaultColorMood: "teal",
    colors: {
      bg: "bg-[#051622]",
      cardBg: "bg-[#0b2436]/85 border-[#14425d]",
      textPrimary: "text-cyan-50",
      textSecondary: "text-cyan-200/75",
      accent: "text-teal-300",
      btnPrimary: "bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold shadow-teal-950/60",
      btnSecondary: "bg-[#0e3047] hover:bg-[#164666] text-cyan-100 border-[#1c5577]",
      borderColor: "border-[#14425d]",
    },
    decorations: {
      icon: "🌊",
      motif: "ocean-tide",
      ambientGlowClass: "from-teal-950/40 via-[#051622]/70 to-[#020b12]",
    },
  },

  // -------------------------------------------------------------
  // 6. Enchanted Garden 🌿 (Release 1.1)
  // -------------------------------------------------------------
  "enchanted-garden": {
    id: "enchanted-garden",
    name: "Enchanted Garden",
    emoji: "🌿",
    moodDescription: "Botanical sanctuary whispered in evergreen moss and morning mist",
    paletteDescription: "Deep forest pine, silvery sage, botanical cream, and dew",
    representativeAccent: "#34d399",
    defaultColorMood: "green",
    colors: {
      bg: "bg-[#0a1811]",
      cardBg: "bg-[#132b1f]/85 border-[#214734]",
      textPrimary: "text-emerald-50",
      textSecondary: "text-emerald-200/75",
      accent: "text-emerald-300",
      btnPrimary: "bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-emerald-950/60",
      btnSecondary: "bg-[#173828] hover:bg-[#1f4a35] text-emerald-100 border-[#27563f]",
      borderColor: "border-[#214734]",
    },
    decorations: {
      icon: "🌿",
      motif: "botanical-leaves",
      ambientGlowClass: "from-emerald-950/40 via-[#0a1811]/70 to-[#040c08]",
    },
  },

  // -------------------------------------------------------------
  // 7. Golden Hour 🌅 (Release 1.1)
  // -------------------------------------------------------------
  "golden-hour": {
    id: "golden-hour",
    name: "Golden Hour",
    emoji: "🌇",
    moodDescription: "Intimate and intoxicating sunset warmth melting into twilight",
    paletteDescription: "Caramelized peach, honey amber, warm apricot, and rich bronze",
    representativeAccent: "#f97316",
    defaultColorMood: "peach",
    colors: {
      bg: "bg-[#201007]",
      cardBg: "bg-[#331b0e]/85 border-[#542d17]",
      textPrimary: "text-orange-50",
      textSecondary: "text-orange-200/75",
      accent: "text-orange-300",
      btnPrimary: "bg-orange-500 hover:bg-orange-400 text-stone-950 font-bold shadow-orange-950/60",
      btnSecondary: "bg-[#422212] hover:bg-[#522b17] text-orange-100 border-[#65371e]",
      borderColor: "border-[#542d17]",
    },
    decorations: {
      icon: "🌇",
      motif: "sunset-radiance",
      ambientGlowClass: "from-orange-950/40 via-[#201007]/70 to-[#120803]",
    },
  },

  // -------------------------------------------------------------
  // 8. Lavender Dreams 💜 (Release 1.1)
  // -------------------------------------------------------------
  "lavender-dreams": {
    id: "lavender-dreams",
    name: "Lavender Dreams",
    emoji: "💜",
    moodDescription: "Gentle wistful lullaby of blossoming lilac and soft starlight",
    paletteDescription: "Midnight violet, velvet lilac, wisteria glow, and ivory",
    representativeAccent: "#c084fc",
    defaultColorMood: "lavender",
    colors: {
      bg: "bg-[#170e28]",
      cardBg: "bg-[#25183f]/85 border-[#3d2764]",
      textPrimary: "text-purple-50",
      textSecondary: "text-purple-200/75",
      accent: "text-purple-300",
      btnPrimary: "bg-purple-500 hover:bg-purple-400 text-white font-semibold shadow-purple-950/60",
      btnSecondary: "bg-[#2f1f4e] hover:bg-[#3c2863] text-purple-100 border-[#4d327d]",
      borderColor: "border-[#3d2764]",
    },
    decorations: {
      icon: "💜",
      motif: "lavender-glow",
      ambientGlowClass: "from-purple-950/40 via-[#170e28]/70 to-[#0e0719]",
    },
  },

  // -------------------------------------------------------------
  // 9. Cozy Love 🧸 (Release 1.1)
  // -------------------------------------------------------------
  "cozy-love": {
    id: "cozy-love",
    name: "Cozy Love",
    emoji: "🧸",
    moodDescription: "Heartwarming embrace of cocoa, cashmere blankets, and tender smiles",
    paletteDescription: "Deep cocoa, velvety caramel, warm cinnamon, and muted biscuit",
    representativeAccent: "#f59e0b",
    defaultColorMood: "peach",
    colors: {
      bg: "bg-[#1c130d]",
      cardBg: "bg-[#2c1e15]/85 border-[#473223]",
      textPrimary: "text-amber-50",
      textSecondary: "text-amber-200/75",
      accent: "text-amber-300",
      btnPrimary: "bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold shadow-amber-950/60",
      btnSecondary: "bg-[#38261b] hover:bg-[#473123] text-amber-100 border-[#573d2c]",
      borderColor: "border-[#473223]",
    },
    decorations: {
      icon: "🧸",
      motif: "warm-hearts",
      ambientGlowClass: "from-amber-950/40 via-[#1c130d]/70 to-[#100a06]",
    },
  },

  // -------------------------------------------------------------
  // 10. Starlit Night 🌌 (Release 1.1)
  // -------------------------------------------------------------
  "starlit-night": {
    id: "starlit-night",
    name: "Starlit Night",
    emoji: "🌌",
    moodDescription: "Infinite celestial wonders under a quiet starry midnight sky",
    paletteDescription: "Deep cosmic obsidian, constellation indigo, and pulsar white",
    representativeAccent: "#818cf8",
    defaultColorMood: "blue",
    colors: {
      bg: "bg-[#070b1a]",
      cardBg: "bg-[#0e1633]/85 border-[#1b2754]",
      textPrimary: "text-indigo-50",
      textSecondary: "text-indigo-200/75",
      accent: "text-indigo-300",
      btnPrimary: "bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-indigo-950/60",
      btnSecondary: "bg-[#152047] hover:bg-[#1d2b5c] text-indigo-100 border-[#263773]",
      borderColor: "border-[#1b2754]",
    },
    decorations: {
      icon: "🌌",
      motif: "constellation-sparkle",
      ambientGlowClass: "from-indigo-950/40 via-[#070b1a]/70 to-[#03060f]",
    },
  },

  // -------------------------------------------------------------
  // 11. Strawberry Kiss 🍓 (Release 1.1)
  // -------------------------------------------------------------
  "strawberry-kiss": {
    id: "strawberry-kiss",
    name: "Strawberry Kiss",
    emoji: "🍓",
    moodDescription: "Playful, sweet passion overflowing with ruby berries and pure joy",
    paletteDescription: "Rich crimson, strawberry scarlet, berry cream, and mint accents",
    representativeAccent: "#f43f5e",
    defaultColorMood: "red",
    colors: {
      bg: "bg-[#21090e]",
      cardBg: "bg-[#331119]/85 border-[#541e2b]",
      textPrimary: "text-rose-50",
      textSecondary: "text-rose-200/75",
      accent: "text-rose-400",
      btnPrimary: "bg-rose-600 hover:bg-rose-500 text-white font-semibold shadow-rose-950/60",
      btnSecondary: "bg-[#421721] hover:bg-[#521c2a] text-rose-100 border-[#652434]",
      borderColor: "border-[#541e2b]",
    },
    decorations: {
      icon: "🍓",
      motif: "berry-glow",
      ambientGlowClass: "from-red-950/40 via-[#21090e]/70 to-[#120407]",
    },
  },

  // -------------------------------------------------------------
  // 12. Cloud Nine ☁️ (Release 1.1)
  // -------------------------------------------------------------
  "cloud-nine": {
    id: "cloud-nine",
    name: "Cloud Nine",
    emoji: "☁️",
    moodDescription: "Ethereal weightlessness floating peacefully above the world",
    paletteDescription: "Atmospheric cloud dusk, misty cyan, pastel periwinkle, and pearl",
    representativeAccent: "#38bdf8",
    defaultColorMood: "blue",
    colors: {
      bg: "bg-[#0b1420]",
      cardBg: "bg-[#142336]/85 border-[#203652]",
      textPrimary: "text-sky-50",
      textSecondary: "text-sky-200/75",
      accent: "text-sky-300",
      btnPrimary: "bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold shadow-sky-950/60",
      btnSecondary: "bg-[#1a2d45] hover:bg-[#223a59] text-sky-100 border-[#2a476c]",
      borderColor: "border-[#203652]",
    },
    decorations: {
      icon: "☁️",
      motif: "floating-clouds",
      ambientGlowClass: "from-sky-950/40 via-[#0b1420]/70 to-[#050b12]",
    },
  },

  // -------------------------------------------------------------
  // 13. Classic Romance 🖤 (Release 1.1)
  // -------------------------------------------------------------
  "classic-romance": {
    id: "classic-romance",
    name: "Classic Romance",
    emoji: "🖤",
    moodDescription: "Timeless black-tie grandeur, red roses, and eternal devotion",
    paletteDescription: "Pure noir, ivory silk, vintage champagne gold, and ruby accents",
    representativeAccent: "#e11d48",
    defaultColorMood: "rose",
    colors: {
      bg: "bg-[#09090b]",
      cardBg: "bg-[#141417]/90 border-[#27272a]",
      textPrimary: "text-zinc-50",
      textSecondary: "text-zinc-300/80",
      accent: "text-rose-400",
      btnPrimary: "bg-rose-600 hover:bg-rose-500 text-white font-semibold shadow-rose-950/60",
      btnSecondary: "bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border-zinc-700",
      borderColor: "border-[#27272a]",
    },
    decorations: {
      icon: "🖤",
      motif: "black-tie-elegance",
      ambientGlowClass: "from-zinc-900/50 via-[#09090b]/80 to-black",
    },
  },
};

export const THEME_LIST = Object.values(THEME_REGISTRY);

export function isValidThemeId(id: unknown): id is ThemeId {
  return typeof id === "string" && id in THEME_REGISTRY;
}

/**
 * Resolves theme configuration deterministically with safe fallback to midnight-velvet.
 * Integrates optional custom overrides (color mood, custom proposal emoji, celebration emoji).
 */
export function resolveTheme(
  themeId?: unknown,
  customOverrides?: unknown
): ResolvedTheme {
  const safeId: ThemeId = isValidThemeId(themeId) ? themeId : "midnight-velvet";
  const definition = THEME_REGISTRY[safeId] || THEME_REGISTRY["midnight-velvet"];

  let parsedOverrides: ProposalThemeCustomization = {};
  if (customOverrides && typeof customOverrides === "object") {
    parsedOverrides = customOverrides as ProposalThemeCustomization;
  } else if (typeof customOverrides === "string") {
    try {
      parsedOverrides = JSON.parse(customOverrides) as ProposalThemeCustomization;
    } catch {
      parsedOverrides = {};
    }
  }

  // Resolve Color Mood (creator-selected mood or theme default)
  const chosenColorMood = isValidColorMood(parsedOverrides.color_mood)
    ? parsedOverrides.color_mood
    : definition.defaultColorMood;
  const colorMood = resolveColorMood(chosenColorMood, definition.defaultColorMood);

  // Proposal Emoji: Fallback to theme definition emoji
  const proposalEmoji =
    typeof parsedOverrides.proposal_emoji === "string" && parsedOverrides.proposal_emoji.trim()
      ? parsedOverrides.proposal_emoji.trim()
      : definition.emoji;

  // Celebration Emoji: Fallback to celebratory diamond ring
  const celebrationEmoji =
    typeof parsedOverrides.celebration_emoji === "string" && parsedOverrides.celebration_emoji.trim()
      ? parsedOverrides.celebration_emoji.trim()
      : "💍";

  // Merge active color mood into theme primary button & highlights ONLY if creator explicitly specified a color mood
  const hasExplicitColorMood = isValidColorMood(parsedOverrides.color_mood);
  const mergedColors = hasExplicitColorMood
    ? {
        ...definition.colors,
        accent: colorMood.accentClass,
        btnPrimary: colorMood.btnPrimaryClass,
      }
    : { ...definition.colors };

  return {
    definition,
    colors: mergedColors,
    colorMood,
    proposalEmoji,
    celebrationEmoji,
    decorations: definition.decorations,
  };
}
