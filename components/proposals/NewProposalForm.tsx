"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { THEME_LIST } from "@/lib/themes";

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
    <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm text-slate-900">
      <div className="mb-6">
        <Link
          href="/app/proposals"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
        >
          &larr; Back to Dashboard
        </Link>
        <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 font-serif">
          Create New Proposal
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Initialize your romantic proposal narrative and partner details.
        </p>
      </div>

      {error && (
        <div
          role="alert"
          aria-live="polite"
          className="mb-6 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700"
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label
            htmlFor="title"
            className="block text-xs font-semibold text-slate-700 uppercase tracking-wider"
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
            className="mt-1.5 block w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-xs placeholder-slate-400 focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500 disabled:opacity-50"
            placeholder="e.g., Sophia's Rooftop Proposal"
          />
        </div>

        <div>
          <label
            htmlFor="partnerName"
            className="block text-xs font-semibold text-slate-700 uppercase tracking-wider"
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
            className="mt-1.5 block w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-xs placeholder-slate-400 focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500 disabled:opacity-50"
            placeholder="e.g., Sophia"
          />
        </div>

        <div>
          <label
            htmlFor="themeId"
            className="block text-xs font-semibold text-slate-700 uppercase tracking-wider"
          >
            Recipient Visual Theme
          </label>
          <select
            id="themeId"
            value={themeId}
            onChange={(e) => setThemeId(e.target.value)}
            disabled={loading}
            className="mt-1.5 block w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-xs focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500 disabled:opacity-50 cursor-pointer"
          >
            {THEME_LIST.map((theme) => (
              <option key={theme.id} value={theme.id}>
                {theme.name} {theme.emoji} — {theme.moodDescription}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="customSlug"
            className="block text-xs font-semibold text-slate-700 uppercase tracking-wider"
          >
            Custom URL Slug (Optional)
          </label>
          <div className="mt-1.5 flex rounded-xl shadow-xs">
            <span className="inline-flex items-center rounded-l-xl border border-r-0 border-slate-300 bg-slate-50 px-3.5 text-xs font-mono text-slate-500">
              /p/
            </span>
            <input
              id="customSlug"
              type="text"
              value={customSlug}
              onChange={(e) => setCustomSlug(e.target.value)}
              disabled={loading}
              className="block w-full min-w-0 rounded-none rounded-r-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500 disabled:opacity-50"
              placeholder="leave blank for secure random slug"
            />
          </div>
          <p className="mt-1.5 text-xs text-slate-500">
            If left blank, an unguessable random slug will be generated automatically.
          </p>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-rose-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2 disabled:opacity-50 cursor-pointer"
          >
            {loading ? "Creating..." : "Create Draft & Open Editor \u2192"}
          </button>
        </div>
      </form>
    </div>
  );
}
