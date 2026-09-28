"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ProposalRecord } from "@/lib/db/repositories";

export interface ProposalResponseItem {
  id: string;
  choice: string;
  custom_note: string | null;
  created_at: string;
}

interface ProposalSettingsProps {
  proposal: ProposalRecord;
  initialResponses?: ProposalResponseItem[];
}

export default function ProposalSettingsClient({
  proposal: initialProposal,
  initialResponses = [],
}: ProposalSettingsProps) {
  const router = useRouter();
  const [proposal, setProposal] = useState<ProposalRecord>(initialProposal);
  const [responses] = useState<ProposalResponseItem[]>(initialResponses);
  const [slug, setSlug] = useState(proposal.slug);
  const [slugSaving, setSlugSaving] = useState(false);
  const [slugError, setSlugError] = useState<string | null>(null);
  const [slugSuccess, setSlugSuccess] = useState(false);

  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [publishSuccess, setPublishSuccess] = useState<string | null>(null);

  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [copied, setCopied] = useState(false);

  const handleCopyLink = async () => {
    try {
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const fullUrl = `${origin}/p/${proposal.slug}`;
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
    }
  };

  const handleUpdateSlug = async (e: React.FormEvent) => {
    e.preventDefault();
    setSlugSaving(true);
    setSlugError(null);
    setSlugSuccess(false);

    try {
      const res = await fetch(`/api/proposals/${proposal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
      });

      const data = await res.json();
      if (!res.ok) {
        setSlugError(data.error || "Failed to update custom URL slug");
        setSlugSaving(false);
        return;
      }

      setProposal(data.proposal);
      setSlugSaving(false);
      setSlugSuccess(true);
      setTimeout(() => setSlugSuccess(false), 3000);
    } catch {
      setSlugError("Network error while updating slug");
      setSlugSaving(false);
    }
  };

  const handlePublishToggle = async (action: "publish" | "unpublish") => {
    setPublishing(true);
    setPublishError(null);
    setPublishSuccess(null);

    try {
      const res = await fetch(`/api/proposals/${proposal.id}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      const data = await res.json();
      if (!res.ok) {
        setPublishError(data.error || `Failed to ${action} proposal`);
        setPublishing(false);
        return;
      }

      setProposal(data.proposal);
      setPublishing(false);
      setPublishSuccess(
        action === "publish"
          ? "Proposal successfully published! Live mutable updates are active."
          : "Proposal unpublished and switched to private draft."
      );
      setTimeout(() => setPublishSuccess(null), 4000);
    } catch {
      setPublishError(`Network error while trying to ${action}`);
      setPublishing(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this proposal? This action cannot be undone.")) {
      return;
    }

    setDeleting(true);
    setDeleteError(null);

    try {
      const res = await fetch(`/api/proposals/${proposal.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        setDeleteError(data.error || "Failed to delete proposal");
        setDeleting(false);
        return;
      }

      router.push("/app/proposals");
      router.refresh();
    } catch {
      setDeleteError("Network error while deleting proposal");
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-900 pb-16">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        {/* Top Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 bg-white p-5 rounded-2xl shadow-xs">
          <div>
            <Link
              href={`/app/proposals/${proposal.id}`}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
            >
              &larr; Back to Editor
            </Link>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 font-serif">
              Proposal Settings &amp; Responses
            </h1>
          </div>
          <div className="flex items-center space-x-2">
            <Link
              href={`/app/proposals/${proposal.id}/preview`}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors"
            >
              <span>👁️</span>
              <span>Preview</span>
            </Link>
          </div>
        </div>

        <div className="space-y-6">
          {/* URL Slug Management */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-7 shadow-xs">
            <h2 className="text-base font-bold text-slate-900 font-serif">
              Custom Link &amp; Web Address
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              This will be the unique link given to your partner when published.
            </p>

            <form onSubmit={handleUpdateSlug} className="mt-4">
              {slugError && (
                <div
                  role="alert"
                  className="mb-3 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700"
                >
                  {slugError}
                </div>
              )}
              {slugSuccess && (
                <div
                  role="status"
                  className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-medium text-emerald-700"
                >
                  ✓ Slug updated successfully!
                </div>
              )}

              <div className="flex rounded-xl shadow-xs">
                <span className="inline-flex items-center rounded-l-xl border border-r-0 border-slate-300 bg-slate-50 px-3.5 text-xs font-mono text-slate-500">
                  /p/
                </span>
                <input
                  type="text"
                  id="slug"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase())}
                  required
                  className="block w-full min-w-0 flex-1 rounded-none border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500 font-mono"
                />
                <button
                  type="submit"
                  disabled={slugSaving || slug === proposal.slug}
                  className="inline-flex items-center rounded-r-xl border border-l-0 border-rose-600 bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 focus:outline-none disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {slugSaving ? "Saving..." : "Update Slug"}
                </button>
              </div>
            </form>

            {proposal.status === "PUBLISHED" && (
              <div className="mt-4 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs">
                <span className="font-mono text-slate-700 truncate">
                  /p/{proposal.slug}
                </span>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="ml-3 shrink-0 font-bold text-rose-600 hover:text-rose-700 transition-colors cursor-pointer"
                >
                  {copied ? "✓ Copied!" : "Copy Link"}
                </button>
              </div>
            )}
          </div>

          {/* Publication Management */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-7 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 font-serif">
                  Publication Status
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Publishing makes your proposal live on its unique link. Publishing is 100% free with no paywall.
                </p>
              </div>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold border ${
                  proposal.status === "PUBLISHED"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-slate-100 text-slate-700 border-slate-200"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    proposal.status === "PUBLISHED" ? "bg-emerald-500" : "bg-slate-400"
                  }`}
                />
                Current: {proposal.status}
              </span>
            </div>

            {publishError && (
              <div
                role="alert"
                className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700"
              >
                {publishError}
              </div>
            )}

            {publishSuccess && (
              <div
                role="status"
                className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-medium text-emerald-700"
              >
                {publishSuccess}
              </div>
            )}

            <div className="mt-6 flex flex-wrap items-center gap-3">
              {proposal.status !== "PUBLISHED" ? (
                <button
                  type="button"
                  onClick={() => handlePublishToggle("publish")}
                  disabled={publishing}
                  className="rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {publishing ? "Processing..." : "Publish Proposal Free \u2192"}
                </button>
              ) : (
                <>
                  <a
                    href={`/p/${proposal.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors"
                  >
                    Open Live Proposal ↗
                  </a>
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    {copied ? "✓ Copied to Clipboard!" : "Copy Live Link"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePublishToggle("unpublish")}
                    disabled={publishing}
                    className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 disabled:opacity-50 transition-colors cursor-pointer"
                  >
                    {publishing ? "Processing..." : "Unpublish (Make Private Draft)"}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Persisted Recipient Responses Section (DEC-002 / Q2) */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-7 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 font-serif">
                  Recipient Responses
                </h2>
                <p className="text-xs text-slate-500">
                  Responses submitted by your partner on your published proposal link.
                </p>
              </div>
              <span className="rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-700 border border-rose-200">
                {responses.length} {responses.length === 1 ? "Response" : "Responses"}
              </span>
            </div>

            {responses.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center bg-slate-50/50">
                <div className="text-3xl mb-2">💌</div>
                <p className="text-xs font-semibold text-slate-700">
                  No responses recorded yet.
                </p>
                <p className="text-[11px] text-slate-400 mt-1 max-w-sm mx-auto">
                  When your partner answers your proposal on the live link, their answer and note will appear here immediately.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {responses.map((resp) => (
                  <div
                    key={resp.id}
                    className="rounded-xl border border-slate-200 bg-slate-50/60 p-4"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800 border border-emerald-200">
                        <span>💍</span>
                        <span>{resp.choice}</span>
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {new Date(resp.created_at).toLocaleString()}
                      </span>
                    </div>

                    {resp.custom_note && (
                      <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3.5 text-xs italic text-slate-800 leading-relaxed">
                        &ldquo;{resp.custom_note}&rdquo;
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Danger Zone: Soft Delete */}
          <div className="rounded-2xl border border-red-200 bg-red-50/40 p-6 sm:p-7 shadow-xs">
            <h2 className="text-base font-bold text-red-900 font-serif">
              Danger Zone
            </h2>
            <p className="mt-1 text-xs text-red-700">
              Soft delete this proposal. It will be removed from your dashboard and will no longer be accessible.
            </p>
            {deleteError && (
              <div className="mt-3 rounded-lg bg-red-100 p-2 text-xs font-medium text-red-800">
                {deleteError}
              </div>
            )}
            <div className="mt-4">
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 transition-colors cursor-pointer"
              >
                {deleting ? "Deleting..." : "Delete Proposal"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
