import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { render, screen, fireEvent } from "@testing-library/react";
import { CURATED_TRACKS, DEFAULT_TRACK, getTrackById } from "@/lib/audio/tracks";
import { useAmbientAudio } from "@/components/audio/useAmbientAudio";
import AmbientAudioControl from "@/components/audio/AmbientAudioControl";
import SceneOrchestrator from "@/components/scenes/SceneOrchestrator";
import { PublicProposalProjection } from "@/lib/db/repositories";

describe("Milestone 8: Ambient Music Engine & Autoplay Handler", () => {
  // Mock Audio implementation for jsdom
  class MockAudio {
    src: string;
    loop: boolean = false;
    preload: string = "auto";
    muted: boolean = false;
    volume: number = 1.0;
    paused: boolean = true;
    eventListeners: Record<string, EventListener[]> = {};

    constructor(src?: string) {
      this.src = src || "";
    }

    addEventListener(event: string, listener: EventListener) {
      if (!this.eventListeners[event]) {
        this.eventListeners[event] = [];
      }
      this.eventListeners[event].push(listener);
    }

    removeEventListener(event: string, listener: EventListener) {
      if (this.eventListeners[event]) {
        this.eventListeners[event] = this.eventListeners[event].filter(
          (l) => l !== listener
        );
      }
    }

    dispatchEvent(event: Event): boolean {
      const listeners = this.eventListeners[event.type] || [];
      listeners.forEach((l) => l(event));
      return true;
    }

    async play(): Promise<void> {
      this.paused = false;
      return Promise.resolve();
    }

    pause(): void {
      this.paused = true;
      const event = new Event("pause");
      this.dispatchEvent(event);
    }
  }

  const originalAudio = window.Audio;

  beforeEach(() => {
    vi.useFakeTimers();
    sessionStorage.clear();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).Audio = MockAudio;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    window.Audio = originalAudio;
    sessionStorage.clear();
  });

  describe("1. Curated Tracks Registry", () => {
    it("provides curated royalty-free audio tracks", () => {
      expect(CURATED_TRACKS.length).toBeGreaterThanOrEqual(2);
      expect(DEFAULT_TRACK.id).toBe("ambient-romance");
      expect(DEFAULT_TRACK.src).toBe("/audio/ambient-romance.wav");
    });

    it("retrieves tracks by id or falls back to default safely", () => {
      const track = getTrackById("gentle-reflection");
      expect(track.id).toBe("gentle-reflection");
      expect(track.src).toBe("/audio/gentle-reflection.wav");

      const unknown = getTrackById("unknown-track");
      expect(unknown.id).toBe(DEFAULT_TRACK.id);

      const nullTrack = getTrackById(null);
      expect(nullTrack.id).toBe(DEFAULT_TRACK.id);
    });
  });

  describe("2. Audio Engine State & Autoplay Lifecycle", () => {
    it("2.1 initial state is inactive (idle, unmuted, not activated)", () => {
      const { result } = renderHook(() =>
        useAmbientAudio({ proposalSlug: "test-slug-1" })
      );

      expect(result.current.status).toBe("idle");
      expect(result.current.isMuted).toBe(false);
      expect(result.current.hasActivated).toBe(false);
      expect(result.current.track.id).toBe(DEFAULT_TRACK.id);
    });

    it("2.2 activates audio after user interaction and begins smooth fade-in", async () => {
      const { result } = renderHook(() =>
        useAmbientAudio({
          proposalSlug: "test-slug-2",
          targetVolume: 0.5,
          fadeDurationMs: 1000,
        })
      );

      await act(async () => {
        await result.current.activateAudio();
      });

      expect(result.current.hasActivated).toBe(true);
      expect(result.current.status).toBe("playing");

      // Fast-forward fade interval
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(result.current.status).toBe("playing");
    });

    it("2.3 handles repeated activation calls idempotently", async () => {
      const { result } = renderHook(() =>
        useAmbientAudio({ proposalSlug: "test-slug-3" })
      );

      await act(async () => {
        await result.current.activateAudio();
      });
      expect(result.current.hasActivated).toBe(true);

      // Second activation call should be a safe no-op
      await act(async () => {
        await result.current.activateAudio();
      });
      expect(result.current.hasActivated).toBe(true);
      expect(result.current.status).toBe("playing");
    });

    it("2.4 supports mute and unmute with session persistence", async () => {
      const { result } = renderHook(() =>
        useAmbientAudio({ proposalSlug: "test-slug-mute" })
      );

      // Start playing
      await act(async () => {
        await result.current.activateAudio();
      });
      expect(result.current.isMuted).toBe(false);

      // Mute
      act(() => {
        result.current.toggleMute();
      });
      expect(result.current.isMuted).toBe(true);
      expect(sessionStorage.getItem("proposera_audio_muted_test-slug-mute")).toBe("true");

      // Unmute
      act(() => {
        result.current.toggleMute();
      });
      expect(result.current.isMuted).toBe(false);
      expect(sessionStorage.getItem("proposera_audio_muted_test-slug-mute")).toBe("false");
    });

    it("2.5 preserves saved mute preference from sessionStorage on initial load", () => {
      sessionStorage.setItem("proposera_audio_muted_saved-slug", "true");

      const { result } = renderHook(() =>
        useAmbientAudio({ proposalSlug: "saved-slug" })
      );

      expect(result.current.isMuted).toBe(true);
    });

    it("2.6 degrades gracefully when browser autoplay policy blocks play()", async () => {
      // Mock play rejection (e.g. NotAllowedError)
      MockAudio.prototype.play = vi.fn().mockRejectedValue(new Error("NotAllowedError: play() failed"));

      const { result } = renderHook(() =>
        useAmbientAudio({ proposalSlug: "test-slug-blocked" })
      );

      await act(async () => {
        await result.current.activateAudio();
      });

      // Status degrades to paused without crashing or throwing
      expect(result.current.hasActivated).toBe(true);
      expect(result.current.status).toBe("paused");
    });

    it("2.7 degrades gracefully when audio loading fails (error event)", async () => {
      let createdAudio: MockAudio | null = null;
      class ErrorAudio extends MockAudio {
        constructor(src?: string) {
          super(src);
          createdAudio = this;
        }
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).Audio = ErrorAudio;

      const { result } = renderHook(() =>
        useAmbientAudio({ proposalSlug: "test-slug-error" })
      );

      await act(async () => {
        await result.current.activateAudio();
      });

      // Simulate media load failure
      act(() => {
        if (createdAudio) {
          createdAudio.dispatchEvent(new Event("error"));
        }
      });

      expect(result.current.status).toBe("failed");
    });

    it("2.8 handles environments where Audio API is missing gracefully", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (window as any).Audio;

      const { result } = renderHook(() =>
        useAmbientAudio({ proposalSlug: "test-slug-no-audio" })
      );

      await act(async () => {
        await result.current.activateAudio();
      });

      expect(result.current.status).toBe("disabled");
    });

    it("2.9 performs full cleanup on unmount", async () => {
      const pauseSpy = vi.spyOn(MockAudio.prototype, "pause");

      const { result, unmount } = renderHook(() =>
        useAmbientAudio({ proposalSlug: "test-slug-unmount" })
      );

      await act(async () => {
        await result.current.activateAudio();
      });

      unmount();

      expect(pauseSpy).toHaveBeenCalled();
    });
  });

  describe("3. AmbientAudioControl UI Component", () => {
    it("renders accessible audio toggle and switches state on click", async () => {
      const toggleMute = vi.fn();
      const audioState = {
        status: "playing" as const,
        isMuted: false,
        hasActivated: true,
        track: DEFAULT_TRACK,
        activateAudio: vi.fn(),
        toggleMute,
      };

      const { rerender } = render(
        <AmbientAudioControl audio={audioState} prefersReducedMotion={false} />
      );

      const button = screen.getByTestId("ambient-audio-toggle");
      expect(button).toBeDefined();
      expect(button.getAttribute("aria-label")).toBe("Mute romantic background music");

      fireEvent.click(button);
      expect(toggleMute).toHaveBeenCalledTimes(1);

      // Re-render as muted
      rerender(
        <AmbientAudioControl
          audio={{ ...audioState, isMuted: true }}
          prefersReducedMotion={false}
        />
      );
      expect(button.getAttribute("aria-label")).toBe("Unmute romantic background music");
    });

    it("respects prefersReducedMotion by omitting pulsing animations", () => {
      const audioState = {
        status: "playing" as const,
        isMuted: false,
        hasActivated: true,
        track: DEFAULT_TRACK,
        activateAudio: vi.fn(),
        toggleMute: vi.fn(),
      };

      const { container } = render(
        <AmbientAudioControl audio={audioState} prefersReducedMotion={true} />
      );

      // Check that animate-pulse is omitted
      const pulsating = container.querySelector(".animate-pulse");
      expect(pulsating).toBeNull();
    });

    it("renders subtle fallback indicator when audio is disabled or failed", () => {
      const audioState = {
        status: "failed" as const,
        isMuted: false,
        hasActivated: true,
        track: DEFAULT_TRACK,
        activateAudio: vi.fn(),
        toggleMute: vi.fn(),
      };

      render(<AmbientAudioControl audio={audioState} />);

      const indicator = screen.getByLabelText("Background music unavailable");
      expect(indicator).toBeDefined();
    });
  });

  describe("4. Scene Orchestrator Integration & Narrative Decoupling", () => {
    const mockProposal: PublicProposalProjection = {
      slug: "sarah-and-alex-milestone8",
      title: "Sarah & Alex",
      partner_name: "Sarah",
      theme_id: "midnight-velvet",
      custom_theme_overrides: {},
      story_content: {
        introMessage: "Every moment leading here was destined.",
        letterText: "You are my best friend and greatest adventure.",
        question: "Will you marry me, Sarah?",
      },
      published_at: "2026-09-22T00:00:00.000Z",
    };

    it("4.1 begins in Scene 1 with audio control present in header", () => {
      render(<SceneOrchestrator proposal={mockProposal} isInteractive={true} />);

      expect(screen.getByTestId("scene-1")).toBeDefined();
      expect(screen.getByText("Sarah")).toBeDefined();
      expect(screen.getByTestId("ambient-audio-toggle")).toBeDefined();
    });

    it("4.2 advances from Scene 1 to Scene 2 on 'Begin Our Story' click while initiating audio", async () => {
      render(<SceneOrchestrator proposal={mockProposal} isInteractive={true} />);

      const beginBtn = screen.getByText(/Begin Our Story/i);
      await act(async () => {
        fireEvent.click(beginBtn);
      });

      // Scene 2 should be active immediately
      expect(screen.getByTestId("scene-2")).toBeDefined();
      expect(screen.getByText(/Our Journey/i)).toBeDefined();
    });

    it("4.3 advances all scenes through celebration without audio interference", async () => {
      render(<SceneOrchestrator proposal={mockProposal} isInteractive={false} />);

      // Scene 1 -> Scene 2
      fireEvent.click(screen.getByText(/Begin Our Story/i));
      expect(screen.getByTestId("scene-2")).toBeDefined();

      // Scene 2 -> Scene 3
      fireEvent.click(screen.getByText(/Continue/i));
      expect(screen.getByTestId("scene-3")).toBeDefined();
      expect(screen.getByText("Will you marry me, Sarah?")).toBeDefined();

      // Scene 3 -> Scene 4
      fireEvent.click(screen.getByText(/Give My Answer/i));
      expect(screen.getByTestId("scene-4")).toBeDefined();
      expect(screen.getByText(/Will you say Yes\?/i)).toBeDefined();

      // Scene 4 -> Scene 5 (Celebration)
      await act(async () => {
        fireEvent.click(screen.getByText(/YES, ALWAYS & FOREVER/i));
      });
      expect(screen.getByTestId("scene-5")).toBeDefined();
      expect(screen.getByText(/SHE SAID YES!/i)).toBeDefined();
    });
  });
});
