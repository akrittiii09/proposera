import { describe, it, expect, beforeEach } from "vitest";
import {
  THEME_REGISTRY,
  THEME_LIST,
  ThemeId,
  isValidThemeId,
  resolveTheme,
  COLOR_MOOD_REGISTRY,
  COLOR_MOOD_LIST,
  ColorMoodId,
  isValidColorMood,
  resolveColorMood,
  CURATED_EMOJI_LIST,
} from "@/lib/themes";
import { DatabaseSync } from "node:sqlite";
import { SCHEMA_SQL } from "@/lib/db/schema";
import {
  createCreator,
  createProposal,
  updateProposal,
  findProposalById,
  findPublishedProposalBySlug,
  getPublicProjection,
} from "@/lib/db/repositories";

describe("Milestone 1.1: Centralized Theme Registry & Expansion", () => {
  it("includes all 13 unique themes (3 preserved + 10 new)", () => {
    expect(THEME_LIST.length).toBe(13);

    const ids = THEME_LIST.map((t) => t.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(13);

    // Verify 3 preserved themes
    expect(ids).toContain("midnight-velvet");
    expect(ids).toContain("sunset-terrace");
    expect(ids).toContain("celestial-rose");

    // Verify 10 new themes
    expect(ids).toContain("cherry-blossom");
    expect(ids).toContain("ocean-love");
    expect(ids).toContain("enchanted-garden");
    expect(ids).toContain("golden-hour");
    expect(ids).toContain("lavender-dreams");
    expect(ids).toContain("cozy-love");
    expect(ids).toContain("starlit-night");
    expect(ids).toContain("strawberry-kiss");
    expect(ids).toContain("cloud-nine");
    expect(ids).toContain("classic-romance");
  });

  it("verifies all themes possess complete, well-formed configuration contracts", () => {
    for (const theme of THEME_LIST) {
      expect(theme.id).toBeTruthy();
      expect(theme.name).toBeTruthy();
      expect(theme.emoji).toBeTruthy();
      expect(theme.moodDescription).toBeTruthy();
      expect(theme.paletteDescription).toBeTruthy();
      expect(theme.representativeAccent).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(isValidColorMood(theme.defaultColorMood)).toBe(true);

      // Verify colors object
      expect(theme.colors.bg).toBeTruthy();
      expect(theme.colors.cardBg).toBeTruthy();
      expect(theme.colors.textPrimary).toBeTruthy();
      expect(theme.colors.textSecondary).toBeTruthy();
      expect(theme.colors.accent).toBeTruthy();
      expect(theme.colors.btnPrimary).toBeTruthy();
      expect(theme.colors.btnSecondary).toBeTruthy();
      expect(theme.colors.borderColor).toBeTruthy();

      // Verify decorations object
      expect(theme.decorations.icon).toBeTruthy();
      expect(theme.decorations.motif).toBeTruthy();
      expect(theme.decorations.ambientGlowClass).toBeTruthy();
    }
  });

  it("safely falls back to midnight-velvet for unknown or invalid theme identifiers", () => {
    expect(isValidThemeId("unknown-fantasy-theme")).toBe(false);
    expect(isValidThemeId(null)).toBe(false);
    expect(isValidThemeId(undefined)).toBe(false);

    const resolved = resolveTheme("corrupted-or-deleted-theme");
    expect(resolved.definition.id).toBe("midnight-velvet");
    expect(resolved.colors.bg).toBe(THEME_REGISTRY["midnight-velvet"].colors.bg);
  });

  it("preserves exact styling for existing 1.0 themes without custom overrides", () => {
    const midnight = resolveTheme("midnight-velvet");
    expect(midnight.colors.bg).toBe("bg-slate-950");
    expect(midnight.colors.btnPrimary).toContain("bg-rose-600");

    const sunset = resolveTheme("sunset-terrace");
    expect(sunset.colors.bg).toBe("bg-amber-950");
    expect(sunset.colors.btnPrimary).toContain("bg-amber-600");

    const celestial = resolveTheme("celestial-rose");
    expect(celestial.colors.bg).toBe("bg-purple-950");
    expect(celestial.colors.btnPrimary).toContain("bg-pink-600");
  });
});

describe("Milestone 1.1: Color Mood Customization", () => {
  const expectedMoods: ColorMoodId[] = [
    "rose",
    "red",
    "pink",
    "lavender",
    "purple",
    "blue",
    "teal",
    "green",
    "peach",
    "gold",
  ];

  it("verifies all 10 color moods exist and have accessible palette tokens", () => {
    expect(COLOR_MOOD_LIST.length).toBe(10);

    for (const moodId of expectedMoods) {
      expect(isValidColorMood(moodId)).toBe(true);
      const palette = COLOR_MOOD_REGISTRY[moodId];
      expect(palette).toBeDefined();
      expect(palette.id).toBe(moodId);
      expect(palette.name).toBeTruthy();
      expect(palette.previewColor).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(palette.accentClass).toBeTruthy();
      expect(palette.btnPrimaryClass).toBeTruthy();
      expect(palette.highlightClass).toBeTruthy();
      expect(palette.borderClass).toBeTruthy();
    }
  });

  it("resolves invalid color moods deterministically to the fallback", () => {
    expect(isValidColorMood("invalid-color")).toBe(false);
    const resolvedFallback = resolveColorMood("invalid-color", "teal");
    expect(resolvedFallback.id).toBe("teal");
  });

  it("applies customized color mood cleanly to buttons and accents without overriding background", () => {
    const resolved = resolveTheme("ocean-love", { color_mood: "gold" });
    expect(resolved.definition.id).toBe("ocean-love");
    expect(resolved.colors.bg).toBe(THEME_REGISTRY["ocean-love"].colors.bg);
    expect(resolved.colors.btnPrimary).toBe(COLOR_MOOD_REGISTRY["gold"].btnPrimaryClass);
    expect(resolved.colors.accent).toBe(COLOR_MOOD_REGISTRY["gold"].accentClass);
  });
});

describe("Milestone 1.1: Curated Emoji Personalization", () => {
  it("provides a curated collection containing all recommended emoji", () => {
    expect(CURATED_EMOJI_LIST.length).toBeGreaterThanOrEqual(20);
    const recommended = ["💍", "❤️", "💕", "💖", "🥹", "🌹", "✨", "🫶🏻", "🧸", "🌸", "🌙", "💫", "🦋", "🍓", "☁️", "💐", "🥰", "💞", "⭐", "🎀"];
    for (const emo of recommended) {
      expect(CURATED_EMOJI_LIST).toContain(emo);
    }
  });

  it("resolves custom proposal and celebration emoji when provided", () => {
    const resolved = resolveTheme("cherry-blossom", {
      proposal_emoji: "🌸",
      celebration_emoji: "💖",
    });
    expect(resolved.proposalEmoji).toBe("🌸");
    expect(resolved.celebrationEmoji).toBe("💖");
  });

  it("falls back gracefully when emoji overrides are null, empty, or missing", () => {
    const resolved = resolveTheme("starlit-night", {
      proposal_emoji: "",
      celebration_emoji: null,
    });
    expect(resolved.proposalEmoji).toBe(THEME_REGISTRY["starlit-night"].emoji);
    expect(resolved.celebrationEmoji).toBe("💍");
  });
});

describe("Milestone 1.1: Database Persistence & Public Projection Lifecycle", () => {
  let db: DatabaseSync;

  beforeEach(() => {
    db = new DatabaseSync(":memory:");
    db.exec("PRAGMA foreign_keys = ON;");
    db.exec(SCHEMA_SQL);
  });

  it("persists and loads customized theme, color mood, and emoji across the proposal lifecycle", () => {
    const creator = createCreator(db, {
      email: "creator@test.com",
      passwordHash: "hash123",
      role: "CREATOR",
    });

    // 1. Create with new theme (cherry-blossom)
    const proposal = createProposal(db, {
      creatorId: creator.id,
      title: "Spring Blossoms",
      partnerName: "Elena",
      themeId: "cherry-blossom",
    });
    expect(proposal.theme_id).toBe("cherry-blossom");

    // 2. Update with custom color mood & emoji personalization
    const updated = updateProposal(db, proposal.id, creator.id, {
      customThemeOverrides: {
        color_mood: "peach",
        proposal_emoji: "🌸",
        celebration_emoji: "🎀",
      },
      status: "PUBLISHED",
    });

    expect(updated).not.toBeNull();
    const fetched = findProposalById(db, proposal.id);
    expect(fetched).not.toBeNull();
    expect(fetched!.theme_id).toBe("cherry-blossom");

    const parsedOverrides = JSON.parse(fetched!.custom_theme_overrides);
    expect(parsedOverrides.color_mood).toBe("peach");
    expect(parsedOverrides.proposal_emoji).toBe("🌸");
    expect(parsedOverrides.celebration_emoji).toBe("🎀");

    // 3. Verify public projection delivery on published slug
    const published = findPublishedProposalBySlug(db, fetched!.slug);
    expect(published).not.toBeNull();
    const projection = getPublicProjection(published!);
    expect(projection.theme_id).toBe("cherry-blossom");
    expect(projection.custom_theme_overrides).toEqual({
      color_mood: "peach",
      proposal_emoji: "🌸",
      celebration_emoji: "🎀",
    });

    // 4. Resolve theme from public projection
    const resolved = resolveTheme(projection.theme_id, projection.custom_theme_overrides);
    expect(resolved.definition.id).toBe("cherry-blossom");
    expect(resolved.colorMood.id).toBe("peach");
    expect(resolved.proposalEmoji).toBe("🌸");
    expect(resolved.celebrationEmoji).toBe("🎀");
    expect(resolved.colors.accent).toBe(COLOR_MOOD_REGISTRY["peach"].accentClass);
  });

  it("renders legacy/existing proposals with empty overrides deterministically", () => {
    const creator = createCreator(db, {
      email: "creator2@test.com",
      passwordHash: "hash123",
      role: "CREATOR",
    });

    const proposal = createProposal(db, {
      creatorId: creator.id,
      title: "Classic Proposal",
      partnerName: "Sarah",
      themeId: "midnight-velvet",
    });

    const projection = getPublicProjection(proposal);
    const resolved = resolveTheme(projection.theme_id, projection.custom_theme_overrides);

    expect(resolved.definition.id).toBe("midnight-velvet");
    expect(resolved.colorMood.id).toBe("rose");
    expect(resolved.proposalEmoji).toBe(THEME_REGISTRY["midnight-velvet"].emoji);
    expect(resolved.celebrationEmoji).toBe("💍");
  });
});
