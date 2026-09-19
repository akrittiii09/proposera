"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function NewProposalForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [partnerName, setPartnerName] = useState("");
  const [themeId, setThemeId] = useState("midnight-velvet");
  const [customSlug, setCustomSlug] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const payload: Record<string, string> = {
        title,
        partnerName,
        themeId,
      };
      if (customSlug.trim()) {
        payload.slug = customSlug.trim().toLowerCase();
      }

      const res = await fetch("/api/proposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create proposal");
        setLoading(false);
        return;
      }

      // Redirect directly to the newly created proposal editor
      router.push(`/app/proposals/${data.proposal.id}`);
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-xl rounded-2xl border border-neutral-200 bg-white p-6 sm:p-8 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <div className="mb-6">
        <Link
          href="/app/proposals"
          className="text-xs font-medium text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
        >
          &larr; Back to Proposals
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
          Create New Proposal
        </h1>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          Initialize your romantic proposal narrative and partner details.
        </p>
      </div>

      {error && (
        <div
          role="alert"
          aria-live="polite"
          className="mb-6 rounded-lg bg-red-50 p-3 text-sm font-medium text-red-700 dark:bg-red-950/50 dark:text-red-300"
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label
            htmlFor="title"
            className="block text-sm font-medium text-neutral-700 dark:text-neutral-300"
          >
            Proposal Title (Internal Name)
          </label>
          <input
            id="title"
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={loading}
            className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
            placeholder="e.g., Sophia's Rooftop Proposal"
          />
        </div>

        <div>
          <label
            htmlFor="partnerName"
            className="block text-sm font-medium text-neutral-700 dark:text-neutral-300"
          >
            Partner&apos;s First Name
          </label>
          <input
            id="partnerName"
            type="text"
            required
            value={partnerName}
            onChange={(e) => setPartnerName(e.target.value)}
            disabled={loading}
            className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
            placeholder="e.g., Sophia"
          />
        </div>

        <div>
          <label
            htmlFor="themeId"
            className="block text-sm font-medium text-neutral-700 dark:text-neutral-300"
          >
            Visual Theme
          </label>
          <select
            id="themeId"
            value={themeId}
            onChange={(e) => setThemeId(e.target.value)}
            disabled={loading}
            className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
          >
            <option value="midnight-velvet">Midnight Velvet (Dark, Elegant, Intimate)</option>
            <option value="sunset-terrace">Sunset Terrace (Warm, Golden Hour, Romantic)</option>
            <option value="celestial-rose">Celestial Rose (Soft Pastels, Starry, Whimsical)</option>
          </select>
        </div>

        <div>
          <label
            htmlFor="customSlug"
            className="block text-sm font-medium text-neutral-700 dark:text-neutral-300"
          >
            Custom URL Slug (Optional)
          </label>
          <div className="mt-1 flex rounded-lg shadow-sm">
            <span className="inline-flex items-center rounded-l-lg border border-r-0 border-neutral-300 bg-neutral-100 px-3 text-xs text-neutral-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400">
              /p/
            </span>
            <input
              id="customSlug"
              type="text"
              value={customSlug}
              onChange={(e) => setCustomSlug(e.target.value)}
              disabled={loading}
              className="block w-full min-w-0 rounded-none rounded-r-lg border border-neutral-300 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
              placeholder="leave blank for secure random slug"
            />
          </div>
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            If left blank, an unguessable random slug will be generated automatically.
          </p>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create Draft & Open Editor"}
          </button>
        </div>
      </form>
    </div>
  );
}
