"use client";
/* eslint-disable @next/next/no-img-element */

import { useState, useEffect, useRef } from "react";
import { PublicProposalProjection } from "@/lib/db/repositories";
import { useAmbientAudio } from "@/components/audio/useAmbientAudio";
import AmbientAudioControl from "@/components/audio/AmbientAudioControl";

export interface SceneOrchestratorProps {
  proposal: PublicProposalProjection;
  isInteractive?: boolean; // true for live recipient, false for preview
}

export default function SceneOrchestrator({
  proposal,
  isInteractive = true,
}: SceneOrchestratorProps) {
  // Scene state: 1: Intro, 2: Story, 3: Question, 4: Response, 5: Celebration
  const [currentScene, setCurrentScene] = useState<number>(1);
  const [customNote, setCustomNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submittedResponse, setSubmittedResponse] = useState<{
    choice: string;
    customNote?: string | null;
  } | null>(null);
  const [mediaFailed, setMediaFailed] = useState(false);
  const sceneContainerRef = useRef<HTMLDivElement>(null);

  // Restore previously submitted response from session if recipient reloads after answering
  useEffect(() => {
    if (typeof window !== "undefined" && isInteractive) {
      try {
        const saved = sessionStorage.getItem(`proposera_response_${proposal.slug}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed?.choice) {
            setSubmittedResponse(parsed);
            setCurrentScene(5);
          }
        }
      } catch {
        // Ignore storage access errors
      }
    }
  }, [proposal.slug, isInteractive]);

  // Focus management: move focus to scene container on every transition for keyboard/screen readers
  useEffect(() => {
    if (sceneContainerRef.current) {
      sceneContainerRef.current.focus();
    }
  }, [currentScene]);

  // Parse story content safely
  const story = proposal.story_content as {
    question?: string;
    introMessage?: string;
    letterText?: string;
    opening_headline?: string;
    opening_letter?: string;
    cover_media_id?: string | null;
    mediaUrl?: string | null;
  };

  const partnerName = proposal.partner_name || "My Love";
  const introText =
    story.introMessage ||
    story.opening_headline ||
    "Every step of my life led me directly to you...";
  const letterText =
    story.letterText ||
    story.opening_letter ||
    "From the moment we met, my world became brighter and fuller. You are my best friend, my constant home, and my greatest adventure. I want to spend all my tomorrows with you.";
  const questionText = story.question || "Will you marry me?";
  const mediaSrc =
    story.mediaUrl ||
    (story.cover_media_id ? `/api/media/${story.cover_media_id}` : null);

  // Reduced motion preference detection
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia) {
      const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
      setPrefersReducedMotion(mediaQuery.matches);
      const listener = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
      mediaQuery.addEventListener("change", listener);
      return () => mediaQuery.removeEventListener("change", listener);
    }
  }, []);

  // Ambient audio engine
  const audioTrackId =
    ((story as { audio_track_id?: string | null })?.audio_track_id as string | null) ||
    ((proposal.custom_theme_overrides as { audio_track_id?: string | null })?.audio_track_id as string | null) ||
    null;

  const audio = useAmbientAudio({
    proposalSlug: proposal.slug,
    trackId: audioTrackId,
    enabled: true,
  });

  const handleBeginStory = () => {
    // Graceful activation on first explicit physical user interaction
    audio.activateAudio().catch(() => {});
    setCurrentScene(2);
  };

  // Theme visual styling tokens
  const themeMap: Record<
    string,
    {
      bg: string;
      cardBg: string;
      textPrimary: string;
      textSecondary: string;
      accent: string;
      btnPrimary: string;
      btnSecondary: string;
    }
  > = {
    "midnight-velvet": {
      bg: "bg-slate-950",
      cardBg: "bg-slate-900/90 border-slate-800",
      textPrimary: "text-slate-100",
      textSecondary: "text-slate-400",
      accent: "text-rose-400",
      btnPrimary: "bg-rose-600 hover:bg-rose-500 text-white shadow-rose-950/50",
      btnSecondary: "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700",
    },
    "sunset-terrace": {
      bg: "bg-amber-950",
      cardBg: "bg-amber-900/80 border-amber-800/80",
      textPrimary: "text-amber-50",
      textSecondary: "text-amber-300/70",
      accent: "text-amber-400",
      btnPrimary: "bg-amber-600 hover:bg-amber-500 text-amber-950 font-bold shadow-amber-950/50",
      btnSecondary: "bg-amber-900/60 hover:bg-amber-800 text-amber-200 border-amber-800",
    },
    "celestial-rose": {
      bg: "bg-purple-950",
      cardBg: "bg-purple-900/80 border-purple-800/80",
      textPrimary: "text-purple-50",
      textSecondary: "text-purple-300/80",
      accent: "text-pink-400",
      btnPrimary: "bg-pink-600 hover:bg-pink-500 text-white shadow-pink-950/50",
      btnSecondary: "bg-purple-900 hover:bg-purple-800 text-purple-200 border-purple-800",
    },
  };

  const currentTheme = themeMap[proposal.theme_id] || themeMap["midnight-velvet"];

  // Handle Response Submission (Strict: never fake celebration if API fails)
  const handleResponseSubmit = async (choice: string) => {
    if (!isInteractive) {
      // Sandbox preview mode: trigger celebration locally without DB persistence
      setSubmittedResponse({ choice, customNote });
      setCurrentScene(5);
      return;
    }

    if (isSubmitting) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch(`/api/proposals/${proposal.slug}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          choice,
          customNote: customNote.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to submit response. Please try again.");
      }

      const responsePayload = { choice, customNote: customNote.trim() || undefined };
      setSubmittedResponse(responsePayload);
      if (typeof window !== "undefined") {
        try {
          sessionStorage.setItem(
            `proposera_response_${proposal.slug}`,
            JSON.stringify(responsePayload)
          );
        } catch {
          // Ignore storage write issues
        }
      }
      setIsSubmitting(false);
      // Advance to Scene 5: Celebration
      setCurrentScene(5);
    } catch (err: unknown) {
      setIsSubmitting(false);
      const msg = err instanceof Error ? err.message : "Network error. Please try again.";
      setSubmitError(msg);
    }
  };

  return (
    <div
      className={`min-h-screen w-full overflow-x-hidden flex flex-col justify-between items-center px-4 py-8 sm:py-12 transition-colors duration-700 ${currentTheme.bg} ${currentTheme.textPrimary}`}
      style={{ minHeight: "100dvh" }}
    >
      {/* Top Subtle Brand Watermark & Ambient Audio Controls */}
      <header className="w-full max-w-md flex justify-between items-center text-xs font-mono tracking-widest uppercase mb-4 z-20">
        <span className="opacity-40">Proposera</span>
        <div className="flex items-center space-x-2">
          <AmbientAudioControl
            audio={audio}
            prefersReducedMotion={prefersReducedMotion}
          />
          <span className="opacity-40">Scene {currentScene} of 5</span>
        </div>
      </header>

      {/* Main Experiential Canvas (Mobile-First 360px - 430px optimized) */}
      <main
        ref={sceneContainerRef}
        tabIndex={-1}
        className="w-full max-w-md flex-1 flex flex-col justify-center my-auto outline-none"
      >
        {/* ======================================================== */}
        {/* SCENE 1: Introduction / Opening                          */}
        {/* ======================================================== */}
        {currentScene === 1 && (
          <div
            data-testid="scene-1"
            className="flex flex-col items-center text-center space-y-6 animate-fadeIn py-6"
          >
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-3xl shadow-inner mb-2 border border-white/10">
              💌
            </div>
            <div>
              <p className={`text-xs font-semibold tracking-widest uppercase ${currentTheme.accent}`}>
                A Special Message For
              </p>
              <h1 className="mt-2 text-3xl sm:text-4xl font-extrabold tracking-tight font-serif">
                {partnerName}
              </h1>
            </div>

            {mediaSrc && !mediaFailed && (
              <div className="w-full max-w-xs aspect-video rounded-2xl overflow-hidden shadow-2xl border border-white/10 relative my-2">
                <img
                  src={mediaSrc}
                  alt="Romantic memory"
                  className="w-full h-full object-cover"
                  onError={() => setMediaFailed(true)}
                />
              </div>
            )}

            <p className={`text-sm sm:text-base leading-relaxed max-w-xs italic ${currentTheme.textSecondary}`}>
              &ldquo;{introText}&rdquo;
            </p>

            <div className="pt-6 w-full">
              <button
                type="button"
                onClick={handleBeginStory}
                className={`w-full min-h-[48px] px-6 py-3.5 rounded-full font-semibold text-sm tracking-wide shadow-lg transition-transform active:scale-95 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:ring-offset-2 focus:ring-offset-slate-950 ${currentTheme.btnPrimary}`}
              >
                Begin Our Story &rarr;
              </button>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* SCENE 2: Story / Romantic Letter                         */}
        {/* ======================================================== */}
        {currentScene === 2 && (
          <div
            data-testid="scene-2"
            className="flex flex-col space-y-6 animate-fadeIn py-4"
          >
            <div className="text-center">
              <span className={`text-xs font-semibold tracking-wider uppercase ${currentTheme.accent}`}>
                Our Journey
              </span>
              <h2 className="mt-1 text-2xl font-bold tracking-tight font-serif">
                To My Forever Person
              </h2>
            </div>

            <div
              className={`rounded-2xl border p-6 shadow-xl backdrop-blur-sm max-h-[60vh] overflow-y-auto break-words ${currentTheme.cardBg}`}
            >
              <p className="whitespace-pre-wrap text-sm sm:text-base leading-relaxed font-sans">
                {letterText}
              </p>
            </div>

            <div className="flex gap-3 pt-2 w-full">
              <button
                type="button"
                onClick={() => setCurrentScene(1)}
                className={`min-h-[48px] px-4 py-3 rounded-full text-xs font-medium border transition-colors focus:outline-none focus:ring-2 focus:ring-rose-400 focus:ring-offset-2 focus:ring-offset-slate-950 ${currentTheme.btnSecondary}`}
              >
                &larr; Back
              </button>
              <button
                type="button"
                onClick={() => setCurrentScene(3)}
                className={`flex-1 min-h-[48px] px-6 py-3.5 rounded-full font-semibold text-sm shadow-lg transition-transform active:scale-95 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:ring-offset-2 focus:ring-offset-slate-950 ${currentTheme.btnPrimary}`}
              >
                Continue &rarr;
              </button>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* SCENE 3: Proposal Reveal                                 */}
        {/* ======================================================== */}
        {currentScene === 3 && (
          <div
            data-testid="scene-3"
            className="flex flex-col items-center text-center space-y-8 animate-fadeIn py-8"
          >
            <div className="w-20 h-20 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-4xl shadow-xl">
              💍
            </div>

            <div className="space-y-4">
              <p className={`text-xs font-semibold uppercase tracking-widest ${currentTheme.accent}`}>
                There is only one question left
              </p>
              <h2 className="text-3xl sm:text-4xl font-black tracking-tight font-serif leading-tight">
                {questionText}
              </h2>
            </div>

            <div className="pt-6 w-full space-y-3">
              <button
                type="button"
                onClick={() => setCurrentScene(4)}
                className={`w-full min-h-[52px] px-6 py-4 rounded-full font-bold text-base shadow-2xl tracking-wide transition-all transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:ring-offset-2 focus:ring-offset-slate-950 ${currentTheme.btnPrimary}`}
              >
                Give My Answer 💖
              </button>
              <button
                type="button"
                onClick={() => setCurrentScene(2)}
                className={`w-full min-h-[48px] py-2 text-xs font-medium opacity-60 hover:opacity-100 transition-opacity focus:outline-none focus:ring-2 focus:ring-rose-400 rounded-lg ${currentTheme.textSecondary}`}
              >
                &larr; Read Letter Again
              </button>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* SCENE 4: Response Interaction                            */}
        {/* ======================================================== */}
        {currentScene === 4 && (
          <div
            data-testid="scene-4"
            className="flex flex-col space-y-6 animate-fadeIn py-4"
          >
            <div className="text-center">
              <span className={`text-xs font-semibold tracking-wider uppercase ${currentTheme.accent}`}>
                Your Answer
              </span>
              <h2 className="mt-1 text-2xl font-bold font-serif">
                Will you say Yes?
              </h2>
            </div>

            {submitError && (
              <div
                role="alert"
                className="rounded-xl border border-red-500/30 bg-red-950/60 p-3 text-xs text-red-200 text-center"
              >
                {submitError}
              </div>
            )}

            {/* Optional Romantic Note Input */}
            <div className={`rounded-2xl border p-4 ${currentTheme.cardBg}`}>
              <label
                htmlFor="customNote"
                className="block text-xs font-medium mb-1.5 opacity-80"
              >
                Add an optional heartfelt note:
              </label>
              <textarea
                id="customNote"
                rows={3}
                maxLength={500}
                value={customNote}
                onChange={(e) => setCustomNote(e.target.value)}
                placeholder="Write whatever is in your heart..."
                disabled={isSubmitting}
                className="w-full rounded-xl bg-black/20 border border-white/10 px-3 py-2 text-sm text-inherit placeholder-white/30 focus:border-rose-400 focus:outline-none focus:ring-1 focus:ring-rose-400"
              />
              <div className="flex justify-end text-[10px] opacity-50 mt-1">
                {customNote.length} / 500 characters
              </div>
            </div>

            {/* Accessible, Non-manipulative Response Control */}
            <div className="space-y-3 pt-2">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleResponseSubmit("YES_ALWAYS_AND_FOREVER")}
                className={`w-full min-h-[52px] rounded-full font-bold text-sm sm:text-base tracking-wide shadow-xl transition-all transform active:scale-95 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:ring-offset-2 focus:ring-offset-slate-950 ${currentTheme.btnPrimary}`}
              >
                {isSubmitting ? "Sealing Your Answer..." : "YES, ALWAYS & FOREVER 💍"}
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setCurrentScene(3)}
                className={`w-full min-h-[48px] rounded-full text-xs font-medium border transition-colors focus:outline-none focus:ring-2 focus:ring-rose-400 focus:ring-offset-2 focus:ring-offset-slate-950 ${currentTheme.btnSecondary}`}
              >
                &larr; Back to Question
              </button>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* SCENE 5: Celebration                                     */}
        {/* ======================================================== */}
        {currentScene === 5 && (
          <div
            data-testid="scene-5"
            role="status"
            aria-live="polite"
            className="flex flex-col items-center text-center space-y-6 animate-fadeIn py-8"
          >
            {/* Visual celebration effects (particle simulation or accessible static typography) */}
            {!prefersReducedMotion ? (
              <div className="relative flex items-center justify-center">
                <div className="text-6xl animate-bounce">🎉</div>
                <span className="absolute -top-3 -right-4 text-3xl animate-pulse">✨</span>
                <span className="absolute -bottom-2 -left-4 text-3xl animate-pulse">💖</span>
              </div>
            ) : (
              <div className="text-6xl">💍</div>
            )}

            <div className="space-y-3">
              <span className={`text-xs font-bold tracking-widest uppercase ${currentTheme.accent}`}>
                Forever Begins Today
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold font-serif">
                SHE SAID YES!
              </h2>
              <p className={`text-sm sm:text-base max-w-xs mx-auto italic ${currentTheme.textSecondary}`}>
                Your response has been sealed into your love story forever.
              </p>
            </div>

            {submittedResponse?.customNote && (
              <div className={`mt-4 rounded-2xl border p-4 max-w-xs text-xs italic ${currentTheme.cardBg}`}>
                &ldquo;{submittedResponse.customNote}&rdquo;
              </div>
            )}

            <div className="pt-4">
              <button
                type="button"
                onClick={() => setCurrentScene(1)}
                className={`min-h-[44px] px-5 py-2.5 rounded-full text-xs font-medium border transition-colors opacity-80 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:ring-offset-2 focus:ring-offset-slate-950 ${currentTheme.btnSecondary}`}
              >
                Replay Story ↺
              </button>
            </div>

            <div className="pt-4 text-xs font-mono opacity-50">
              💍 Proposera &bull; Sealed with love
            </div>
          </div>
        )}
      </main>

      {/* Persistent Audio / Pacing Status Footer */}
      <footer className="w-full max-w-md text-center text-[10px] opacity-40 font-sans tracking-wide pt-4">
        {isInteractive ? "Intimate Proposal Experience" : "Creator Studio Sandbox Preview"}
        {audio.status === "playing" && !audio.isMuted && (
          <span className="ml-2">• 🎵 {audio.track.title}</span>
        )}
      </footer>
    </div>
  );
}
