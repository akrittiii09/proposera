import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import ThemeCustomizer from "@/components/proposals/ThemeCustomizer";
import SceneOrchestrator from "@/components/scenes/SceneOrchestrator";
import { THEME_LIST, COLOR_MOOD_LIST, resolveTheme } from "@/lib/themes";
import { PublicProposalProjection } from "@/lib/db/repositories";

// Mock ambient audio to avoid Web Audio API issues in JSDOM
vi.mock("@/components/audio/useAmbientAudio", () => ({
  useAmbientAudio: () => ({
    status: "idle",
    isMuted: false,
    track: { title: "Ambient Romance" },
    toggleMute: vi.fn(),
    activateAudio: vi.fn().mockResolvedValue(undefined),
  }),
}));

describe("Release 1.1 Visual & UX Acceptance Audit", () => {
  describe("1. ThemeCustomizer Component Visual & Interactive Audit", () => {
    it("renders all 13 curated themes with accessible labels, emoji, and swatches", () => {
      const onThemeChange = vi.fn();
      render(
        <ThemeCustomizer
          selectedThemeId="midnight-velvet"
          onThemeChange={onThemeChange}
          onColorMoodChange={vi.fn()}
          onProposalEmojiChange={vi.fn()}
          onCelebrationEmojiChange={vi.fn()}
          samplePartnerName="Julianne"
        />
      );

      // Verify header counts
      expect(screen.getByText("13 Curated Themes")).toBeDefined();

      // Verify all 13 theme names exist
      for (const theme of THEME_LIST) {
        expect(screen.getByText(theme.name)).toBeDefined();
      }

      // Verify active indicator
      expect(screen.getByText("Active")).toBeDefined();

      // Verify clicking theme fires callback
      const oceanCard = screen.getByText("Ocean Love");
      fireEvent.click(oceanCard);
      expect(onThemeChange).toHaveBeenCalledWith("ocean-love");
    });

    it("renders all 10 color moods with accessible buttons and swatches", () => {
      const onColorMoodChange = vi.fn();
      render(
        <ThemeCustomizer
          selectedThemeId="ocean-love"
          onThemeChange={vi.fn()}
          selectedColorMood="teal"
          onColorMoodChange={onColorMoodChange}
          onProposalEmojiChange={vi.fn()}
          onCelebrationEmojiChange={vi.fn()}
          samplePartnerName="Julianne"
        />
      );

      for (const mood of COLOR_MOOD_LIST) {
        expect(screen.getByText(mood.name)).toBeDefined();
      }

      const goldMoodBtn = screen.getByText("Gold");
      fireEvent.click(goldMoodBtn);
      expect(onColorMoodChange).toHaveBeenCalledWith("gold");
    });

    it("renders proposal and celebration emoji selectors with accessible aria-labels", () => {
      const onProposalEmojiChange = vi.fn();
      const onCelebrationEmojiChange = vi.fn();
      render(
        <ThemeCustomizer
          selectedThemeId="ocean-love"
          onThemeChange={vi.fn()}
          onColorMoodChange={vi.fn()}
          proposalEmoji="🌸"
          onProposalEmojiChange={onProposalEmojiChange}
          celebrationEmoji="💖"
          onCelebrationEmojiChange={onCelebrationEmojiChange}
          samplePartnerName="Julianne"
        />
      );

      const propEmojiBtn = screen.getByLabelText("Select emoji 🌹");
      fireEvent.click(propEmojiBtn);
      expect(onProposalEmojiChange).toHaveBeenCalledWith("🌹");

      const celebEmojiBtn = screen.getByLabelText("Select celebration emoji ✨");
      fireEvent.click(celebEmojiBtn);
      expect(onCelebrationEmojiChange).toHaveBeenCalledWith("✨");
    });

    it("displays live theme preview card with custom emoji and partner name", () => {
      render(
        <ThemeCustomizer
          selectedThemeId="cherry-blossom"
          onThemeChange={vi.fn()}
          onColorMoodChange={vi.fn()}
          proposalEmoji="🌸"
          onProposalEmojiChange={vi.fn()}
          celebrationEmoji="🎀"
          onCelebrationEmojiChange={vi.fn()}
          samplePartnerName="Alexandria"
        />
      );

      expect(screen.getByText("Live Theme Preview")).toBeDefined();
      expect(screen.getByText("Alexandria")).toBeDefined();
      expect(screen.getByText("Begin Our Story →")).toBeDefined();
      expect(screen.getByText("🎀 Celebration Climax Preview")).toBeDefined();
    });
  });

  describe("2. Recipient Journey (/p/[slug]) 5-Scene Visual Audit", () => {
    const mockProposal: PublicProposalProjection = {
      slug: "eternal-love-test",
      title: "Our Forever Journey",
      partner_name: "Genevieve",
      theme_id: "cherry-blossom",
      published_at: "2026-09-29T12:00:00.000Z",
      custom_theme_overrides: {
        color_mood: "pink",
        proposal_emoji: "🌸",
        celebration_emoji: "💖",
      },
      story_content: {
        introMessage: "Every path led me straight to your arms.",
        letterText: "You are the greatest blessing of my entire life. I love you beyond words.",
        question: "Will you make me the happiest person and marry me?",
      },
    };

    it("progresses smoothly through all 5 scenes: Intro -> Story -> Question -> Response -> Celebration", async () => {
      render(<SceneOrchestrator proposal={mockProposal} isInteractive={false} />);

      // Scene 1: Intro
      expect(screen.getByTestId("scene-1")).toBeDefined();
      expect(screen.getByText("Genevieve")).toBeDefined();
      expect(screen.getByText(/Every path led me straight to your arms/)).toBeDefined();
      const beginBtn = screen.getByText("Begin Our Story →");
      expect(beginBtn.className).toContain("min-h-[48px]");

      // Advance to Scene 2: Story
      fireEvent.click(beginBtn);
      expect(screen.getByTestId("scene-2")).toBeDefined();
      expect(screen.getByText("To My Forever Person")).toBeDefined();
      expect(screen.getByText(/You are the greatest blessing of my entire life/)).toBeDefined();

      // Advance to Scene 3: Question
      const continueBtn = screen.getByText("Continue →");
      fireEvent.click(continueBtn);
      expect(screen.getByTestId("scene-3")).toBeDefined();
      expect(screen.getByText("Will you make me the happiest person and marry me?")).toBeDefined();

      // Advance to Scene 4: Response
      const answerBtn = screen.getByText("Give My Answer 💖");
      fireEvent.click(answerBtn);
      expect(screen.getByTestId("scene-4")).toBeDefined();
      expect(screen.getByText("Will you say Yes?")).toBeDefined();

      // Enter optional note
      const textarea = screen.getByPlaceholderText("Write whatever is in your heart...");
      fireEvent.change(textarea, { target: { value: "With all my heart, YES!" } });
      expect(screen.getByText("23 / 500 characters")).toBeDefined();

      // Submit response (Sandbox mode triggers local celebration)
      const yesBtn = screen.getByText("YES, ALWAYS & FOREVER 💍");
      fireEvent.click(yesBtn);

      // Scene 5: Celebration
      expect(screen.getByTestId("scene-5")).toBeDefined();
      expect(screen.getByText("SHE SAID YES!")).toBeDefined();
      expect(screen.getByText("“With all my heart, YES!”")).toBeDefined();
      expect(screen.getAllByText("💖").length).toBeGreaterThanOrEqual(1);
    });

    it("audits visual styling across all 11 required themes", () => {
      const themesToVerify = [
        "midnight-velvet",
        "cherry-blossom",
        "ocean-love",
        "enchanted-garden",
        "golden-hour",
        "lavender-dreams",
        "cozy-love",
        "starlit-night",
        "strawberry-kiss",
        "cloud-nine",
        "classic-romance",
      ];

      for (const themeId of themesToVerify) {
        const proposal: PublicProposalProjection = {
          ...mockProposal,
          theme_id: themeId,
          custom_theme_overrides: {},
        };

        const { unmount } = render(<SceneOrchestrator proposal={proposal} isInteractive={false} />);
        const resolved = resolveTheme(themeId);

        // Verify root container has theme background
        const container = screen.getByTestId("scene-1").closest("div[style]");
        expect(container?.className).toContain(resolved.colors.bg);

        // Verify button has theme primary style
        const btn = screen.getByText("Begin Our Story →");
        expect(btn.className).toContain(resolved.colors.btnPrimary.split(" ")[0]);

        unmount();
      }
    });

    it("verifies mobile-first touch target and overflow safety constraints", () => {
      const { container } = render(<SceneOrchestrator proposal={mockProposal} isInteractive={false} />);

      // Root container has overflow-x-hidden and mobile max-w constraints
      const rootDiv = container.firstChild as HTMLElement;
      expect(rootDiv.className).toContain("overflow-x-hidden");
      expect(rootDiv.className).toContain("w-full");

      // Main experiential canvas is max-w-md (optimized for 360px - 430px viewports)
      const mainCanvas = container.querySelector("main");
      expect(mainCanvas?.className).toContain("max-w-md");
      expect(mainCanvas?.className).toContain("w-full");

      // Primary buttons satisfy mobile touch target >= 48px
      const beginBtn = screen.getByText("Begin Our Story →");
      expect(beginBtn.className).toMatch(/min-h-\[48px\]|min-h-\[52px\]/);
    });
  });
});
