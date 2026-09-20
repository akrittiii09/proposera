"use client";
/* eslint-disable @next/next/no-img-element */

import { useState } from "react";
import Link from "next/link";
import { ProposalRecord } from "@/lib/db/repositories";

interface ProposalEditorProps {
  proposal: ProposalRecord;
}

export default function ProposalEditor({ proposal: initialProposal }: ProposalEditorProps) {
  const [proposal, setProposal] = useState<ProposalRecord>(initialProposal);
  const [title, setTitle] = useState(proposal.title);
  const [partnerName, setPartnerName] = useState(proposal.partner_name);
  const [themeId, setThemeId] = useState(proposal.theme_id);

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

      const res = await fetch(`/api/proposals/${proposal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          partnerName,
          themeId,
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
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      {/* Top Breadcrumb & Action Bar */}
      <div className="mb-6 flex flex-col justify-between gap-4 border-b border-neutral-200 pb-4 sm:flex-row sm:items-center dark:border-neutral-800">
        <div>
          <Link
            href="/app/proposals"
            className="text-xs font-medium text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
          >
            &larr; Back to Dashboard
          </Link>
          <div className="mt-1 flex items-center space-x-3">
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
              {proposal.title}
            </h1>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                proposal.status === "PUBLISHED"
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                  : "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
              }`}
            >
              {proposal.status}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Link
            href={`/app/proposals/${proposal.id}/preview`}
            className="rounded-lg border border-neutral-300 bg-white px-3.5 py-2 text-xs font-semibold text-neutral-700 shadow-sm hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
          >
            👁️ Preview
          </Link>
          <Link
            href={`/app/proposals/${proposal.id}/settings`}
            className="rounded-lg border border-neutral-300 bg-white px-3.5 py-2 text-xs font-semibold text-neutral-700 shadow-sm hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
          >
            ⚙️ Settings & Publish
          </Link>
        </div>
      </div>

      {/* Live Mutable Notice Banner */}
      {proposal.status === "PUBLISHED" && (
        <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-200">
          <span className="font-bold">Live Mutable Publishing Active:</span> This proposal is currently live. Any changes saved below update the published experience immediately on the public URL without creating version snapshots.
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="mb-6 rounded-lg bg-red-50 p-3 text-sm font-medium text-red-700 dark:bg-red-950/50 dark:text-red-300"
        >
          {error}
        </div>
      )}

      {savedSuccess && (
        <div
          role="status"
          className="mb-6 rounded-lg bg-emerald-50 p-3 text-sm font-medium text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
        >
          ✓ Changes saved successfully!
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Basic Proposal Metadata */}
        <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <h2 className="text-base font-semibold text-neutral-900 dark:text-white">
            Proposal Details
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="title"
                className="block text-xs font-medium text-neutral-700 dark:text-neutral-300"
              >
                Internal Title
              </label>
              <input
                id="title"
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
              />
            </div>

            <div>
              <label
                htmlFor="partnerName"
                className="block text-xs font-medium text-neutral-700 dark:text-neutral-300"
              >
                Partner Name
              </label>
              <input
                id="partnerName"
                type="text"
                required
                value={partnerName}
                onChange={(e) => setPartnerName(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
              />
            </div>

            <div className="sm:col-span-2">
              <label
                htmlFor="themeId"
                className="block text-xs font-medium text-neutral-700 dark:text-neutral-300"
              >
                Visual Theme
              </label>
              <select
                id="themeId"
                value={themeId}
                onChange={(e) => setThemeId(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
              >
                <option value="midnight-velvet">Midnight Velvet (Dark & Elegant)</option>
                <option value="sunset-terrace">Sunset Terrace (Warm & Golden)</option>
                <option value="celestial-rose">Celestial Rose (Soft Pastels & Starry)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Narrative & Proposal Content */}
        <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <h2 className="text-base font-semibold text-neutral-900 dark:text-white">
            Story Narrative & Climax
          </h2>
          <div className="mt-4 space-y-4">
            <div>
              <label
                htmlFor="introMessage"
                className="block text-xs font-medium text-neutral-700 dark:text-neutral-300"
              >
                Introductory Opening Message
              </label>
              <input
                id="introMessage"
                type="text"
                value={introMessage}
                onChange={(e) => setIntroMessage(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                placeholder="e.g. Every moment leading here was meant to be..."
              />
            </div>

            <div>
              <label
                htmlFor="letterText"
                className="block text-xs font-medium text-neutral-700 dark:text-neutral-300"
              >
                Romantic Letter / Core Message
              </label>
              <textarea
                id="letterText"
                rows={4}
                value={letterText}
                onChange={(e) => setLetterText(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                placeholder="Write your heart out to your partner..."
              />
            </div>

            <div>
              <label
                htmlFor="question"
                className="block text-xs font-medium text-neutral-700 dark:text-neutral-300"
              >
                The Climax Question
              </label>
              <input
                id="question"
                type="text"
                required
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                placeholder="Will you marry me?"
              />
            </div>
          </div>
        </div>

        {/* Media & Memories (Milestone 7 Pipeline) */}
        <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-neutral-900 dark:text-white">
                Story Photo &amp; Visuals
              </h2>
              <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                Upload a romantic highlight photo (JPEG, PNG, WebP, GIF &le; 8 MB). All EXIF and GPS data are automatically stripped for privacy.
              </p>
            </div>
            {coverMediaId && (
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                Photo Attached
              </span>
            )}
          </div>

          {mediaUploadError && (
            <div
              role="alert"
              className="mt-4 rounded-lg bg-red-50 p-3 text-xs font-medium text-red-700 dark:bg-red-950/50 dark:text-red-300"
            >
              {mediaUploadError}
            </div>
          )}

          <div className="mt-4">
            {mediaUrl || coverMediaId ? (
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="relative aspect-video w-48 overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100 shadow-sm dark:border-neutral-700 dark:bg-neutral-800">
                  <img
                    data-testid="media-upload-preview"
                    src={mediaUrl || `/api/media/${coverMediaId}`}
                    alt="Proposal cover highlight"
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="space-y-2">
                  <p className="text-xs text-neutral-600 dark:text-neutral-300">
                    Optimized WebP ready. Remember to save changes to persist your update.
                  </p>
                  <button
                    type="button"
                    onClick={handleRemoveMedia}
                    className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
                  >
                    Remove Photo
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <label
                  htmlFor="media-file-input"
                  className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-neutral-300 p-6 text-center hover:border-rose-400 dark:border-neutral-700 dark:hover:border-rose-500 cursor-pointer transition-colors"
                >
                  <span className="text-3xl mb-2">📸</span>
                  <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                    {isUploadingMedia ? "Sanitizing & Processing Image..." : "Click or drag to upload a proposal photo"}
                  </span>
                  <span className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1">
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
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-rose-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {saving ? "Saving Changes..." : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
