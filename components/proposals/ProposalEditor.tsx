"use client";
/* eslint-disable @next/next/no-img-element */

import { useState } from "react";
import Link from "next/link";
import { ProposalRecord } from "@/lib/db/repositories";
import ThemeCustomizer from "./ThemeCustomizer";
import { ThemeId, ColorMoodId, ProposalThemeCustomization } from "@/lib/themes";

interface ProposalEditorProps {
  proposal: ProposalRecord;
}

export default function ProposalEditor({ proposal: initialProposal }: ProposalEditorProps) {
  const [proposal, setProposal] = useState<ProposalRecord>(initialProposal);
  const [title, setTitle] = useState(proposal.title);
  const [partnerName, setPartnerName] = useState(proposal.partner_name);
  const [themeId, setThemeId] = useState<ThemeId>(proposal.theme_id as ThemeId);

  // Custom Theme Overrides parsing
  let initialThemeOverrides: ProposalThemeCustomization = {};
  try {
    initialThemeOverrides = JSON.parse(proposal.custom_theme_overrides);
  } catch {
    initialThemeOverrides = {};
  }

  const [colorMood, setColorMood] = useState<ColorMoodId | null>(
    (initialThemeOverrides.color_mood as ColorMoodId) || null
  );
  const [proposalEmoji, setProposalEmoji] = useState<string | null>(
    initialThemeOverrides.proposal_emoji || null
  );
  const [celebrationEmoji, setCelebrationEmoji] = useState<string | null>(
    initialThemeOverrides.celebration_emoji || null
  );

  // Story Content parsing
  let initialStory: {
    question?: string;
    introMessage?: string;
    letterText?: string;
    cover_media_id?: string | null;
    mediaUrl?: string | null;
  } = {};
  try {
    initialStory = JSON.parse(proposal.story_content);
  } catch {
    initialStory = {};
  }

  const [question, setQuestion] = useState(initialStory.question || "Will you marry me?");
  const [introMessage, setIntroMessage] = useState(
    initialStory.introMessage || "Every moment leading here was meant to be..."
  );
  const [letterText, setLetterText] = useState(
    initialStory.letterText || "You are my best friend, my greatest adventure, and my forever love."
  );
  const [coverMediaId, setCoverMediaId] = useState<string | null>(
    initialStory.cover_media_id || null
  );
  const [mediaUrl, setMediaUrl] = useState<string | null>(initialStory.mediaUrl || null);

  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [mediaUploadError, setMediaUploadError] = useState<string | null>(null);

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so re-selecting same file triggers onChange
    e.target.value = "";

    setMediaUploadError(null);
    setIsUploadingMedia(true);

    try {
      // 1. Request upload permit
      const permitRes = await fetch("/api/media/permit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proposalId: proposal.id,
          fileSize: file.size,
          mimeType: file.type || "image/jpeg",
          filename: file.name,
        }),
      });

      const permitData = await permitRes.json();
      if (!permitRes.ok) {
        setMediaUploadError(permitData.error || "Failed to obtain upload permit");
        setIsUploadingMedia(false);
        return;
      }

      // 2. Upload file binary with permit ID
      const formData = new FormData();
      formData.append("permitId", permitData.permitId);
      formData.append("file", file);

      const uploadRes = await fetch(permitData.uploadUrl || "/api/media/upload", {
        method: "POST",
        body: formData,
      });

      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) {
        setMediaUploadError(uploadData.error || "Failed to upload image");
        setIsUploadingMedia(false);
        return;
      }

      setCoverMediaId(uploadData.asset.id);
      setMediaUrl(uploadData.asset.url);
      setIsUploadingMedia(false);
    } catch {
      setMediaUploadError("Network error during photo upload");
      setIsUploadingMedia(false);
    }
  };

  const handleRemoveMedia = () => {
    setCoverMediaId(null);
    setMediaUrl(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSavedSuccess(false);

    try {
      const storyContent = {
        question,
        introMessage,
        letterText,
        cover_media_id: coverMediaId,
        mediaUrl: mediaUrl || (coverMediaId ? `/api/media/${coverMediaId}` : null),
      };

      const customThemeOverrides: ProposalThemeCustomization = {
        ...initialThemeOverrides,
        color_mood: colorMood,
        proposal_emoji: proposalEmoji,
        celebration_emoji: celebrationEmoji,
      };

      const res = await fetch(`/api/proposals/${proposal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          partnerName,
          themeId,
          customThemeOverrides,
          storyContent,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to save proposal changes");
        setSaving(false);
        return;
      }

      setProposal(data.proposal);
      setSaving(false);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 4000);
    } catch {
      setError("Network error occurred while saving");
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-900 pb-16">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        {/* Top Breadcrumb & Action Bar */}
        <div className="mb-6 flex flex-col justify-between gap-4 border-b border-slate-200 bg-white p-5 rounded-2xl shadow-xs sm:flex-row sm:items-center">
          <div>
            <Link
              href="/app/proposals"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
            >
              &larr; Back to Dashboard
            </Link>
            <div className="mt-2 flex items-center space-x-3">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-serif">
                {proposal.title}
              </h1>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold border ${
                  proposal.status === "PUBLISHED"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-rose-50 text-rose-700 border-rose-200"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    proposal.status === "PUBLISHED" ? "bg-emerald-500" : "bg-rose-500"
                  }`}
                />
                {proposal.status}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Link
              href={`/app/proposals/${proposal.id}/preview`}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors"
            >
              <span>👁️</span>
              <span>Preview</span>
            </Link>
            <Link
              href={`/app/proposals/${proposal.id}/settings`}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors"
            >
              <span>⚙️</span>
              <span>Settings &amp; Publish</span>
            </Link>
          </div>
        </div>

        {/* Live Mutable Notice Banner */}
        {proposal.status === "PUBLISHED" && (
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 text-xs text-emerald-900 shadow-xs">
            <div>
              <span className="font-bold">Live Mutable Publishing Active:</span> This proposal is currently live. Any changes saved below update the published experience immediately on the public URL without breaking links or creating snapshots.
            </div>
            <a
              href={`/p/${proposal.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex shrink-0 items-center gap-1 font-bold text-emerald-700 hover:text-emerald-900 underline"
            >
              Open Live ↗
            </a>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700 shadow-xs"
          >
            {error}
          </div>
        )}

        {savedSuccess && (
          <div
            role="status"
            className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-700 shadow-xs"
          >
            ✓ Changes saved successfully and published!
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          {/* Basic Proposal Metadata */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-7 shadow-xs">
            <h2 className="text-base font-bold text-slate-900 font-serif">
              Proposal Details
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="title"
                  className="block text-xs font-semibold text-slate-700 uppercase tracking-wider"
                >
                  Internal Title
                </label>
                <input
                  id="title"
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mt-1.5 block w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-xs focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
                />
              </div>

              <div>
                <label
                  htmlFor="partnerName"
                  className="block text-xs font-semibold text-slate-700 uppercase tracking-wider"
                >
                  Partner Name
                </label>
                <input
                  id="partnerName"
                  type="text"
                  required
                  value={partnerName}
                  onChange={(e) => setPartnerName(e.target.value)}
                  className="mt-1.5 block w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-xs focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
                />
              </div>

            </div>
          </div>

          {/* Release 1.1: Theme Expansion & Personalization Studio */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-7 shadow-xs">
            <h2 className="text-base font-bold text-slate-900 font-serif mb-4">
              Visual Theme &amp; Personalization
            </h2>
            <ThemeCustomizer
              selectedThemeId={themeId}
              onThemeChange={(newTheme) => setThemeId(newTheme)}
              selectedColorMood={colorMood}
              onColorMoodChange={(newMood) => setColorMood(newMood)}
              proposalEmoji={proposalEmoji}
              onProposalEmojiChange={(newEmoji) => setProposalEmoji(newEmoji)}
              celebrationEmoji={celebrationEmoji}
              onCelebrationEmojiChange={(newEmoji) => setCelebrationEmoji(newEmoji)}
              samplePartnerName={partnerName}
              showLivePreview={true}
            />
          </div>

          {/* Narrative & Proposal Content */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-7 shadow-xs">
            <h2 className="text-base font-bold text-slate-900 font-serif">
              Story Narrative &amp; Climax
            </h2>
            <div className="mt-4 space-y-4">
              <div>
                <label
                  htmlFor="introMessage"
                  className="block text-xs font-semibold text-slate-700 uppercase tracking-wider"
                >
                  Introductory Opening Message
                </label>
                <input
                  id="introMessage"
                  type="text"
                  value={introMessage}
                  onChange={(e) => setIntroMessage(e.target.value)}
                  className="mt-1.5 block w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-xs focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
                  placeholder="e.g. Every moment leading here was meant to be..."
                />
              </div>

              <div>
                <label
                  htmlFor="letterText"
                  className="block text-xs font-semibold text-slate-700 uppercase tracking-wider"
                >
                  Romantic Letter / Core Message
                </label>
                <textarea
                  id="letterText"
                  rows={5}
                  value={letterText}
                  onChange={(e) => setLetterText(e.target.value)}
                  className="mt-1.5 block w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-xs focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500 leading-relaxed"
                  placeholder="Write your heart out to your partner..."
                />
              </div>

              <div>
                <label
                  htmlFor="question"
                  className="block text-xs font-semibold text-slate-700 uppercase tracking-wider"
                >
                  The Climax Question
                </label>
                <input
                  id="question"
                  type="text"
                  required
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  className="mt-1.5 block w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-xs focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
                  placeholder="Will you marry me?"
                />
              </div>
            </div>
          </div>

          {/* Media & Memories (Milestone 7 Pipeline) */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-7 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-bold text-slate-900 font-serif">
                  Story Photo &amp; Visuals
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Upload a romantic highlight photo (JPEG, PNG, WebP, GIF &le; 8 MB). All EXIF and GPS data are automatically stripped for privacy.
                </p>
              </div>
              {coverMediaId && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Photo Attached
                </span>
              )}
            </div>

            {mediaUploadError && (
              <div
                role="alert"
                className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700"
              >
                {mediaUploadError}
              </div>
            )}

            <div className="mt-4">
              {mediaUrl || coverMediaId ? (
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <div className="relative aspect-video w-52 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-xs">
                    <img
                      data-testid="media-upload-preview"
                      src={mediaUrl || `/api/media/${coverMediaId}`}
                      alt="Proposal cover highlight"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs text-slate-600 font-medium">
                      Optimized WebP ready. Remember to save changes to persist your update.
                    </p>
                    <button
                      type="button"
                      onClick={handleRemoveMedia}
                      className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 transition-colors cursor-pointer"
                    >
                      Remove Photo
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <label
                    htmlFor="media-file-input"
                    className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/50 p-6 text-center hover:border-rose-400 hover:bg-rose-50/20 cursor-pointer transition-colors"
                  >
                    <span className="text-3xl mb-2">📸</span>
                    <span className="text-xs font-bold text-slate-800">
                      {isUploadingMedia ? "Sanitizing & Processing Image..." : "Click or drag to upload a proposal photo"}
                    </span>
                    <span className="text-[11px] text-slate-500 mt-1">
                      Max 8 MB per file &bull; Automatically converted to privacy-safe WebP
                    </span>
                    <input
                      id="media-file-input"
                      data-testid="media-upload-input"
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      disabled={isUploadingMedia}
                      onChange={handleMediaUpload}
                      className="sr-only"
                    />
                  </label>
                </div>
              )}
            </div>
          </div>

          {/* Save Bar */}
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-rose-600 px-7 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2 disabled:opacity-50 cursor-pointer"
            >
              {saving ? "Saving Changes..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
