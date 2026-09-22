"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { AmbientTrack, getTrackById } from "@/lib/audio/tracks";

export type AudioStatus =
  | "idle"
  | "loading"
  | "playing"
  | "paused"
  | "failed"
  | "disabled";

export interface UseAmbientAudioOptions {
  proposalSlug: string;
  trackId?: string | null;
  targetVolume?: number; // 0.0 to 1.0, default 0.45
  fadeDurationMs?: number; // default 1500ms
  enabled?: boolean; // default true
}

export interface AmbientAudioState {
  status: AudioStatus;
  isMuted: boolean;
  hasActivated: boolean;
  track: AmbientTrack;
  activateAudio: () => Promise<void>;
  toggleMute: () => void;
}

export function useAmbientAudio({
  proposalSlug,
  trackId,
  targetVolume = 0.45,
  fadeDurationMs = 1500,
  enabled = true,
}: UseAmbientAudioOptions): AmbientAudioState {
  const track = getTrackById(trackId);
  const [status, setStatus] = useState<AudioStatus>("idle");
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [hasActivated, setHasActivated] = useState<boolean>(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fadeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const storageKey = `proposera_audio_muted_${proposalSlug}`;

  // Read saved mute preference safely on mount
  useEffect(() => {
    try {
      if (typeof window !== "undefined" && window.sessionStorage) {
        const saved = window.sessionStorage.getItem(storageKey);
        if (saved === "true") {
          setIsMuted(true);
        }
      }
    } catch {
      // Storage unavailable or restricted; ignore safely
    }
  }, [storageKey]);

  // Clean up fade interval
  const clearFadeTimer = useCallback(() => {
    if (fadeTimerRef.current) {
      clearInterval(fadeTimerRef.current);
      fadeTimerRef.current = null;
    }
  }, []);

  // Smooth volume ramp
  const rampVolume = useCallback(
    (audio: HTMLAudioElement, from: number, to: number, durationMs: number) => {
      clearFadeTimer();
      audio.volume = Math.max(0, Math.min(1, from));

      if (durationMs <= 0 || from === to) {
        audio.volume = to;
        return;
      }

      const steps = 25;
      const stepInterval = durationMs / steps;
      const delta = (to - from) / steps;
      let currentStep = 0;

      fadeTimerRef.current = setInterval(() => {
        currentStep++;
        const nextVol = Math.max(0, Math.min(1, from + delta * currentStep));
        audio.volume = nextVol;

        if (currentStep >= steps) {
          clearFadeTimer();
          audio.volume = to;
        }
      }, stepInterval);
    },
    [clearFadeTimer]
  );

  // Initialize audio element lazily
  const getOrCreateAudio = useCallback((): HTMLAudioElement | null => {
    if (!enabled || typeof window === "undefined" || typeof Audio === "undefined") {
      return null;
    }

    if (!audioRef.current) {
      try {
        const audio = new Audio(track.src);
        audio.loop = true;
        audio.preload = "auto";
        audio.muted = isMuted;

        audio.addEventListener("error", () => {
          setStatus("failed");
        });

        audio.addEventListener("pause", () => {
          setStatus((prev) => (prev === "playing" ? "paused" : prev));
        });

        audioRef.current = audio;
      } catch {
        setStatus("failed");
        return null;
      }
    }

    return audioRef.current;
  }, [enabled, isMuted, track.src]);

  // Activate audio on first physical user gesture (e.g. tapping Begin Story)
  const activateAudio = useCallback(async () => {
    if (!enabled || hasActivated) return;

    setHasActivated(true);

    const audio = getOrCreateAudio();
    if (!audio) {
      setStatus("disabled");
      return;
    }

    setStatus("loading");

    try {
      if (isMuted) {
        audio.volume = targetVolume;
        audio.muted = true;
      } else {
        audio.volume = 0;
        audio.muted = false;
      }

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        await playPromise;
      }

      setStatus("playing");

      if (!isMuted) {
        rampVolume(audio, 0, targetVolume, fadeDurationMs);
      }
    } catch {
      // Browser autoplay policy blocked or aborted playback; degrade gracefully without throwing
      setStatus("paused");
    }
  }, [
    enabled,
    hasActivated,
    getOrCreateAudio,
    isMuted,
    targetVolume,
    fadeDurationMs,
    rampVolume,
  ]);

  // Toggle mute / unmute
  const toggleMute = useCallback(() => {
    const audio = audioRef.current || getOrCreateAudio();
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);

    try {
      if (typeof window !== "undefined" && window.sessionStorage) {
        window.sessionStorage.setItem(storageKey, String(nextMuted));
      }
    } catch {
      // Storage unavailable
    }

    if (!audio) return;

    if (nextMuted) {
      // Muting: ramp down swiftly or mute immediately
      audio.muted = true;
    } else {
      // Unmuting
      audio.muted = false;
      if (status !== "playing") {
        audio.volume = 0;
        audio
          .play()
          .then(() => {
            setStatus("playing");
            rampVolume(audio, 0, targetVolume, fadeDurationMs);
          })
          .catch(() => {
            setStatus("paused");
          });
      } else {
        rampVolume(audio, audio.volume, targetVolume, 500);
      }
    }
  }, [
    isMuted,
    getOrCreateAudio,
    storageKey,
    status,
    rampVolume,
    targetVolume,
    fadeDurationMs,
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearFadeTimer();
      if (audioRef.current) {
        try {
          audioRef.current.pause();
          audioRef.current.src = "";
        } catch {
          // Ignore cleanup errors
        }
        audioRef.current = null;
      }
    };
  }, [clearFadeTimer]);

  return {
    status,
    isMuted,
    hasActivated,
    track,
    activateAudio,
    toggleMute,
  };
}
