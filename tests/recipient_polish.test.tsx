import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import SceneOrchestrator from "@/components/scenes/SceneOrchestrator";
import { PublicProposalProjection } from "@/lib/db/repositories";

describe("Recipient Experience Polish & Accessibility", () => {
  const mockProposal: PublicProposalProjection = {
    slug: "emily-forever-polish",
    title: "Emily & James",
    partner_name: "Emily",
    theme_id: "midnight-velvet",
    custom_theme_overrides: {},
    story_content: {
      introMessage: "Every moment leading here was destined.",
      letterText: "You are my best friend and greatest adventure.",
      question: "Will you marry me, Emily?",
      mediaUrl: "/api/media/mock-photo",
    },
    published_at: "2026-09-22T00:00:00.000Z",
  };

  beforeEach(() => {
    sessionStorage.clear();
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }))
    );
  });

  afterEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("handles broken media gracefully by hiding broken image container on error", () => {
    render(<SceneOrchestrator proposal={mockProposal} isInteractive={true} />);

    const img = screen.getByAltText("Romantic memory");
    expect(img).toBeDefined();

    // Trigger image error
    fireEvent.error(img);

    // Image container should now be omitted gracefully
    expect(screen.queryByAltText("Romantic memory")).toBeNull();
  });

  it("renders clean, accessible note label in Scene 4", async () => {
    render(<SceneOrchestrator proposal={mockProposal} isInteractive={false} />);

    // Navigate to Scene 4
    fireEvent.click(screen.getByText(/Begin Our Story/i));
    fireEvent.click(screen.getByText(/Continue/i));
    fireEvent.click(screen.getByText(/Give My Answer/i));

    expect(screen.getByTestId("scene-4")).toBeDefined();
    expect(screen.getByLabelText(/Add an optional heartfelt note/i)).toBeDefined();
  });

  it("restores previously submitted response from sessionStorage and provides replay action", async () => {
    // Simulate stored response from previous session
    sessionStorage.setItem(
      `proposera_response_${mockProposal.slug}`,
      JSON.stringify({
        choice: "YES_ALWAYS_AND_FOREVER",
        customNote: "I love you so much!",
      })
    );

    render(<SceneOrchestrator proposal={mockProposal} isInteractive={true} />);

    // Should immediately display Scene 5 (Celebration)
    expect(screen.getByTestId("scene-5")).toBeDefined();
    expect(screen.getByText(/SHE SAID YES!/i)).toBeDefined();
    expect(screen.getByText(/I love you so much!/i)).toBeDefined();

    // Replay Story action
    const replayBtn = screen.getByText(/Replay Story/i);
    expect(replayBtn).toBeDefined();

    await act(async () => {
      fireEvent.click(replayBtn);
    });

    // Should return to Scene 1
    expect(screen.getByTestId("scene-1")).toBeDefined();
  });

  it("has status role and live region on celebration scene", async () => {
    render(<SceneOrchestrator proposal={mockProposal} isInteractive={false} />);

    // Navigate to Scene 4
    fireEvent.click(screen.getByText(/Begin Our Story/i));
    fireEvent.click(screen.getByText(/Continue/i));
    fireEvent.click(screen.getByText(/Give My Answer/i));

    // Submit answer in sandbox
    await act(async () => {
      fireEvent.click(screen.getByText(/YES, ALWAYS & FOREVER/i));
    });

    const celebration = screen.getByTestId("scene-5");
    expect(celebration.getAttribute("role")).toBe("status");
    expect(celebration.getAttribute("aria-live")).toBe("polite");
  });
});
