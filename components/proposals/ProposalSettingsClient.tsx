"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ProposalRecord } from "@/lib/db/repositories";
import PaywallCard from "@/components/billing/PaywallCard";

export interface ProposalResponseItem {
  id: string;
  choice: string;
  custom_note: string | null;
  created_at: string;
}

interface ProposalSettingsProps {
  proposal: ProposalRecord;
  isEntitled: boolean;
  initialResponses?: ProposalResponseItem[];
}

export default function ProposalSettingsClient({
  proposal: initialProposal,
  isEntitled: initialIsEntitled,
  initialResponses = [],
}: ProposalSettingsProps) {
  const router = useRouter();
  const [proposal, setProposal] = useState<ProposalRecord>(initialProposal);
  const [entitled, setEntitled] = useState(initialIsEntitled);
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
        if (res.status === 403) {
          setPublishError(
            data.error || "Publishing is gated behind an active Proposera entitlement. Payment required."
          );
        } else {
          setPublishError(data.error || `Failed to ${action} proposal`);
        }
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
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-center justify-between border-b border-neutral-200 pb-4 dark:border-neutral-800">
        <div>
          <Link
            href={`/app/proposals/${proposal.id}`}
            className="text-xs font-medium text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
          >
            &larr; Back to Editor
          </Link>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
            Proposal Settings
          </h1>
        </div>
        <div className="flex items-center space-x-2">
          <Link
            href={`/app/proposals/${proposal.id}/preview`}
            className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
          >
            Preview
          </Link>
        </div>
      </div>

      <div className="space-y-6">
        {/* URL Slug Management */}
        <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <h2 className="text-base font-semibold text-neutral-900 dark:text-white">
            Custom Link &amp; Web Address
          </h2>
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            This will be the unique link given to your partner when published.
          </p>

          <form onSubmit={handleUpdateSlug} className="mt-4">
            {slugError && (
              <div
                role="alert"
                className="mb-3 rounded-md bg-red-50 p-2.5 text-xs font-medium text-red-700 dark:bg-red-950/50 dark:text-red-300"
              >
                {slugError}
              </div>
            )}
            {slugSuccess && (
              <div
                role="status"
                className="mb-3 rounded-md bg-emerald-50 p-2.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
              >
                ✓ Slug updated successfully!
              </div>
            )}

            <div className="flex rounded-lg shadow-sm">
              <span className="inline-flex items-center rounded-l-lg border border-r-0 border-neutral-300 bg-neutral-50 px-3 text-xs text-neutral-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400">
                /p/
              </span>
              <input
                type="text"
                id="slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase())}
                required
                className="block w-full min-w-0 flex-1 rounded-none border border-neutral-300 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
              />
              <button
                type="submit"
                disabled={slugSaving || slug === proposal.slug}
                className="inline-flex items-center rounded-r-lg border border-l-0 border-rose-600 bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 focus:outline-none disabled:opacity-50"
              >
                {slugSaving ? "Saving..." : "Update Slug"}
              </button>
            </div>
          </form>
        </div>

        {/* Publication & Entitlement Gate */}
        <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-base font-semibold text-neutral-900 dark:text-white">
                Publication Status
              </h2>
              <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                Manage proposal visibility. Publishing requires an active Proposera Entitlement.
              </p>
            </div>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                proposal.status === "PUBLISHED"
                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300"
                  : "bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-300"
              }`}
            >
              Current: {proposal.status}
            </span>
          </div>

          {publishError && (
            <div
              role="alert"
              className="mt-4 rounded-md bg-red-50 p-3 text-xs font-medium text-red-700 dark:bg-red-950/50 dark:text-red-300"
            >
              {publishError}
            </div>
          )}

          {publishSuccess && (
            <div
              role="status"
              className="mt-4 rounded-md bg-emerald-50 p-3 text-xs font-medium text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
            >
              {publishSuccess}
            </div>
          )}

          <div className="mt-4">
            <PaywallCard
              isEntitled={entitled}
              onEntitled={() => {
                setEntitled(true);
                setPublishError(null);
                router.refresh();
              }}
            />
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            {proposal.status !== "PUBLISHED" ? (
              <button
                type="button"
                onClick={() => handlePublishToggle("publish")}
                disabled={publishing || !entitled}
                title={!entitled ? "An active entitlement is required to publish." : undefined}
                className="rounded-lg bg-emerald-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
              >
                {publishing ? "Processing..." : "Publish Proposal"}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handlePublishToggle("unpublish")}
                disabled={publishing}
                className="rounded-lg border border-neutral-300 bg-white px-5 py-2 text-xs font-semibold text-neutral-700 shadow-sm hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 disabled:opacity-50"
              >
                {publishing ? "Processing..." : "Unpublish (Make Private Draft)"}
              </button>
            )}
          </div>
        </div>

        {/* Persisted Recipient Responses Section (DEC-002 / Q2) */}
        <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-neutral-900 dark:text-white">
                Recipient Responses
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Responses submitted by your partner on your published proposal link.
              </p>
            </div>
            <span className="rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
              {responses.length} {responses.length === 1 ? "Response" : "Responses"}
            </span>
          </div>

          {responses.length === 0 ? (
            <div className="rounded-xl border border-dashed border-neutral-200 p-8 text-center dark:border-neutral-800">
              <div className="text-2xl mb-2">💌</div>
              <p className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
                No responses recorded yet.
              </p>
              <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-1">
                When your partner answers your proposal on the live link, their answer and note will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {responses.map((resp) => (
                <div
                  key={resp.id}
                  className="rounded-xl border border-neutral-200 bg-neutral-50/60 p-4 dark:border-neutral-800 dark:bg-neutral-800/40"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300">
                      <span>💍</span>
                      <span>{resp.choice}</span>
                    </span>
                    <span className="text-[11px] text-neutral-400 font-mono">
                      {new Date(resp.created_at).toLocaleString()}
                    </span>
                  </div>

                  {resp.custom_note && (
                    <div className="mt-3 rounded-lg border border-neutral-200/80 bg-white p-3 text-xs italic text-neutral-700 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300">
                      &ldquo;{resp.custom_note}&rdquo;
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Danger Zone: Soft Delete */}
        <div className="rounded-xl border border-red-200 bg-red-50/50 p-6 shadow-sm dark:border-red-950/50 dark:bg-red-950/20">
          <h2 className="text-base font-semibold text-red-900 dark:text-red-300">
            Danger Zone
          </h2>
          <p className="mt-1 text-xs text-red-700 dark:text-red-400">
            Soft delete this proposal. It will be removed from your dashboard and will no longer be accessible.
          </p>
          {deleteError && (
            <div className="mt-2 text-xs font-medium text-red-700 dark:text-red-300">
              {deleteError}
            </div>
          )}
          <div className="mt-4">
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
            >
              {deleting ? "Deleting..." : "Delete Proposal"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
