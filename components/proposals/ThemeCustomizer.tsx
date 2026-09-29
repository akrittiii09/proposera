"use client";

import React from "react";
import {
  ThemeId,
  ColorMoodId,
  THEME_LIST,
  COLOR_MOOD_LIST,
  CURATED_EMOJI_LIST,
  resolveTheme,
} from "@/lib/themes";

interface ThemeCustomizerProps {
  selectedThemeId: string;
  onThemeChange: (themeId: ThemeId) => void;
  selectedColorMood?: ColorMoodId | null;
  onColorMoodChange: (mood: ColorMoodId) => void;
  proposalEmoji?: string | null;
  onProposalEmojiChange: (emoji: string) => void;
  celebrationEmoji?: string | null;
  onCelebrationEmojiChange: (emoji: string) => void;
  showLivePreview?: boolean;
  samplePartnerName?: string;
}

export default function ThemeCustomizer({
  selectedThemeId,
  onThemeChange,
  selectedColorMood,
  onColorMoodChange,
  proposalEmoji,
  onProposalEmojiChange,
  celebrationEmoji,
  onCelebrationEmojiChange,
  showLivePreview = true,
  samplePartnerName = "Sophia",
}: ThemeCustomizerProps) {
  const currentResolved = resolveTheme(selectedThemeId, {
    color_mood: selectedColorMood,
    proposal_emoji: proposalEmoji,
    celebration_emoji: celebrationEmoji,
  });

  return (
    <div className="space-y-6">
      {/* 1. Theme Selector Grid */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
            Choose Visual Theme
          </label>
          <span className="text-xs text-slate-500 font-mono">
            {THEME_LIST.length} Curated Themes
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {THEME_LIST.map((t) => {
            const isSelected = selectedThemeId === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => onThemeChange(t.id)}
                className={`relative flex flex-col text-left p-3.5 rounded-2xl border-2 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-rose-500 ${
                  isSelected
                    ? "border-rose-500 ring-2 ring-rose-500/20 shadow-md bg-white"
                    : "border-slate-200 bg-slate-50/50 hover:border-slate-300 hover:bg-white"
                }`}
              >
                <div className="flex items-center justify-between w-full mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-xl" aria-hidden="true">
                      {t.emoji}
                    </span>
                    <span className="text-sm font-bold text-slate-900 font-serif">
                      {t.name}
                    </span>
                  </div>
                  {/* Swatch circle */}
                  <span
                    className="w-4 h-4 rounded-full border border-black/10 shadow-xs shrink-0"
                    style={{ backgroundColor: t.representativeAccent }}
                    title={t.name}
                  />
                </div>

                <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                  {t.moodDescription}
                </p>

                <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-100 text-[10px] text-slate-400">
                  <span className="truncate max-w-[170px]">{t.paletteDescription}</span>
                  {isSelected && (
                    <span className="font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                      Active
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Color Mood Accent Customizer */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-3">
          <div>
            <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Color Mood &amp; Button Accent
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Select an accessible accent palette tailored for high-contrast romantic readability.
            </p>
          </div>
          <span className="text-xs font-medium text-slate-600 capitalize">
            Current: {currentResolved.colorMood.name}
          </span>
        </div>

        <div className="flex flex-wrap gap-2.5 pt-1">
          {COLOR_MOOD_LIST.map((m) => {
            const isChosen =
              selectedColorMood === m.id ||
              (!selectedColorMood && currentResolved.colorMood.id === m.id);
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => onColorMoodChange(m.id)}
                className={`group flex items-center space-x-2 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-rose-500 ${
                  isChosen
                    ? "border-slate-800 bg-slate-900 text-white shadow-xs"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                }`}
              >
                <span
                  className="w-3.5 h-3.5 rounded-full border border-white/20 shadow-xs shrink-0"
                  style={{ backgroundColor: m.previewColor }}
                />
                <span>{m.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Curated Emoji Personalization */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
          Emoji Personalization
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          Select optional romantic symbols for your opening header and final celebration scene.
        </p>

        <div className="grid gap-5 sm:grid-cols-2">
          {/* Proposal / Header Emoji */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Proposal Header Emoji
            </label>
            <div className="flex items-center space-x-3 mb-2.5">
              <span className="text-3xl p-2 rounded-xl bg-slate-100 border border-slate-200 shadow-inner">
                {proposalEmoji || currentResolved.definition.emoji}
              </span>
              <span className="text-xs text-slate-500">
                Appears in the scene introduction header
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5 p-2 rounded-xl bg-slate-50 border border-slate-200 max-h-32 overflow-y-auto">
              {CURATED_EMOJI_LIST.map((emo) => (
                <button
                  key={`prop-${emo}`}
                  type="button"
                  onClick={() => onProposalEmojiChange(emo)}
                  className={`w-8 h-8 rounded-lg text-lg flex items-center justify-center transition-transform hover:scale-110 cursor-pointer focus:outline-none focus:ring-2 focus:ring-rose-500 ${
                    (proposalEmoji || currentResolved.definition.emoji) === emo
                      ? "bg-rose-100 border border-rose-300 ring-2 ring-rose-400"
                      : "hover:bg-white"
                  }`}
                  aria-label={`Select emoji ${emo}`}
                >
                  {emo}
                </button>
              ))}
            </div>
          </div>

          {/* Celebration Climax Emoji */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Celebration Scene Emoji
            </label>
            <div className="flex items-center space-x-3 mb-2.5">
              <span className="text-3xl p-2 rounded-xl bg-slate-100 border border-slate-200 shadow-inner">
                {celebrationEmoji || "💍"}
              </span>
              <span className="text-xs text-slate-500">
                Appears in the &ldquo;SHE SAID YES!&rdquo; climax
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5 p-2 rounded-xl bg-slate-50 border border-slate-200 max-h-32 overflow-y-auto">
              {CURATED_EMOJI_LIST.map((emo) => (
                <button
                  key={`celeb-${emo}`}
                  type="button"
                  onClick={() => onCelebrationEmojiChange(emo)}
                  className={`w-8 h-8 rounded-lg text-lg flex items-center justify-center transition-transform hover:scale-110 cursor-pointer focus:outline-none focus:ring-2 focus:ring-rose-500 ${
                    (celebrationEmoji || "💍") === emo
                      ? "bg-rose-100 border border-rose-300 ring-2 ring-rose-400"
                      : "hover:bg-white"
                  }`}
                  aria-label={`Select celebration emoji ${emo}`}
                >
                  {emo}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 4. Immediate Live Theme Preview */}
      {showLivePreview && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Live Theme Preview
              </h3>
              <p className="text-xs text-slate-500">
                Instant interactive rendering of the selected styling palette and typography.
              </p>
            </div>
            <span className="text-xs font-mono text-slate-400">
              {currentResolved.definition.name} &bull; {currentResolved.colorMood.name}
            </span>
          </div>

          <div
            className={`w-full rounded-2xl p-6 sm:p-8 transition-colors duration-500 border ${currentResolved.colors.bg} ${currentResolved.colors.textPrimary} ${currentResolved.colors.borderColor}`}
          >
            <div className="max-w-md mx-auto text-center space-y-4">
              <div
                className="w-12 h-12 mx-auto rounded-full bg-white/10 flex items-center justify-center text-2xl border border-white/20 shadow-inner"
                aria-hidden="true"
              >
                {currentResolved.proposalEmoji}
              </div>

              <div>
                <p className={`text-[11px] font-semibold tracking-widest uppercase ${currentResolved.colors.accent}`}>
                  A Special Message For
                </p>
                <h4 className="text-2xl font-bold font-serif mt-1">
                  {samplePartnerName || "Sophia"}
                </h4>
              </div>

              <div
                className={`p-4 rounded-xl border backdrop-blur-sm text-xs leading-relaxed ${currentResolved.colors.cardBg}`}
              >
                <p className="italic opacity-90">
                  &ldquo;Every step of my life led me directly to you...&rdquo;
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  tabIndex={-1}
                  className={`w-full py-3 px-6 rounded-full text-xs font-bold tracking-wide shadow-lg transition-transform active:scale-95 ${currentResolved.colors.btnPrimary}`}
                >
                  Begin Our Story &rarr;
                </button>
              </div>

              <div className="text-[10px] opacity-40 font-mono pt-1">
                {currentResolved.celebrationEmoji} Celebration Climax Preview
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
