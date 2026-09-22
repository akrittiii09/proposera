"use client";

import React from "react";
import { AmbientAudioState } from "./useAmbientAudio";

export interface AmbientAudioControlProps {
  audio: AmbientAudioState;
  prefersReducedMotion?: boolean;
  className?: string;
}

export default function AmbientAudioControl({
  audio,
  prefersReducedMotion = false,
  className = "",
}: AmbientAudioControlProps) {
  const { status, isMuted, toggleMute } = audio;

  if (status === "disabled" || status === "failed") {
    // Audio is unavailable in this environment; render accessible subtle indicator without throwing
    return (
      <div
        className={`inline-flex items-center justify-center min-w-[48px] min-h-[48px] px-2 text-xs opacity-30 select-none ${className}`}
        aria-label="Background music unavailable"
        title="Audio unavailable on this device"
      >
        <span className="text-sm">🔇</span>
      </div>
    );
  }

  const isPlaying = status === "playing" && !isMuted;
  const label = isPlaying
    ? "Mute romantic background music"
    : "Unmute romantic background music";

  return (
    <button
      type="button"
      onClick={toggleMute}
      aria-label={label}
      title={label}
      data-testid="ambient-audio-toggle"
      className={`inline-flex items-center justify-center min-w-[48px] min-h-[48px] rounded-full p-2.5 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:ring-offset-2 active:scale-95 ${
        isPlaying
          ? "bg-rose-500/20 text-rose-300 border border-rose-500/30 shadow-md hover:bg-rose-500/30"
          : "bg-white/10 text-white/70 border border-white/15 hover:bg-white/20"
      } ${className}`}
    >
      {isPlaying ? (
        <span className="flex items-center space-x-1">
          <span
            className={`text-base leading-none ${
              !prefersReducedMotion ? "animate-pulse" : ""
            }`}
          >
            🎵
          </span>
          <span className="sr-only">Music playing</span>
        </span>
      ) : (
        <span className="flex items-center space-x-1">
          <span className="text-base leading-none opacity-70">🔇</span>
          <span className="sr-only">Music muted</span>
        </span>
      )}
    </button>
  );
}
