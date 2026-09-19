"use client";

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
  let initialStory: { question?: string; introMessage?: string; letterText?: string } = {};
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

  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
