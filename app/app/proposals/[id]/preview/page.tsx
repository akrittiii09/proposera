/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth/requireAuth";
import { getDb } from "@/lib/db";
import { findProposalById } from "@/lib/db/repositories";

interface ProposalPreviewPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function ProposalPreviewPage({ params }: ProposalPreviewPageProps) {
  const { creator } = await requireAuth();
  const { id } = await params;

  const db = getDb();
  const proposal = findProposalById(db, id);

  // Non-disclosure check: 404 for unowned or deleted proposals
  if (!proposal || proposal.creator_id !== creator.id || proposal.status === "DELETED") {
    notFound();
  }

  let storyContent: {
    question?: string;
    introMessage?: string;
    letterText?: string;
    cover_media_id?: string | null;
    mediaUrl?: string | null;
  } = {};
  try {
    storyContent = JSON.parse(proposal.story_content);
  } catch {
    storyContent = {};
  }

  const mediaSrc = storyContent.mediaUrl || (storyContent.cover_media_id ? `/api/media/${storyContent.cover_media_id}` : null);

  const themeClasses: Record<string, { bg: string; card: string; text: string; accent: string }> = {
    "midnight-velvet": {
      bg: "bg-slate-950",
      card: "bg-slate-900/80 border-slate-800",
      text: "text-slate-100",
      accent: "text-rose-400",
    },
    "sunset-terrace": {
      bg: "bg-amber-950",
      card: "bg-amber-900/70 border-amber-800",
      text: "text-amber-100",
      accent: "text-amber-400",
    },
    "celestial-rose": {
      bg: "bg-purple-950",
      card: "bg-purple-900/80 border-purple-800",
      text: "text-purple-100",
      accent: "text-pink-400",
    },
  };

  const currentTheme = themeClasses[proposal.theme_id] || themeClasses["midnight-velvet"];

  return (
    <div className="min-h-screen bg-slate-50/50 py-8 text-slate-900">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        {/* Navigation Bar */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 bg-white p-5 rounded-2xl shadow-xs">
          <div className="flex items-center space-x-4">
            <Link
              href={`/app/proposals/${proposal.id}`}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
            >
              &larr; Back to Editor
            </Link>
            <span className="rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-rose-700 border border-rose-200/60">
              Studio Sandbox Preview
            </span>
          </div>

          <div className="flex items-center space-x-3">
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
              Status: {proposal.status}
            </span>
            <Link
              href={`/app/proposals/${proposal.id}/settings`}
              className="rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors"
            >
              Settings &amp; Publish
            </Link>
          </div>
        </div>

        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-center text-xs text-amber-900 shadow-xs">
          <strong>Creator Sandbox:</strong> This is an authentic preview simulating how your proposal appears to your recipient. Interactive responses are recorded only on the live published link.
        </div>

        {/* Mobile Viewport Simulation Frame (Preserves Cinematic Proposal Theme) */}
        <div className="mx-auto max-w-sm rounded-[2.5rem] border-8 border-slate-800 bg-slate-900 p-2 shadow-2xl">
          <div className={`relative flex min-h-[600px] flex-col justify-between overflow-hidden rounded-[2rem] p-6 ${currentTheme.bg} ${currentTheme.text}`}>
            {/* Top decorative element */}
            <div className="text-center pt-4">
              <div className="mx-auto mb-2 h-1 w-12 rounded-full bg-slate-600/40" />
              <p className="text-xs font-medium uppercase tracking-widest opacity-70">
                A Special Message For
              </p>
              <h2 className={`mt-1 text-2xl font-bold tracking-tight font-serif ${currentTheme.accent}`}>
                {proposal.partner_name}
              </h2>
            </div>

            {/* Media Image */}
            {mediaSrc && (
              <div className="mt-4 overflow-hidden rounded-xl border border-white/10 shadow-lg">
                <img
                  src={mediaSrc}
                  alt="Proposal highlight"
                  className="h-44 w-full object-cover"
                />
              </div>
            )}

            {/* Story Letter */}
            <div className={`my-4 space-y-4 rounded-2xl border p-5 backdrop-blur-sm ${currentTheme.card}`}>
              {storyContent.introMessage && (
                <p className="text-xs italic leading-relaxed opacity-90">
                  &ldquo;{storyContent.introMessage}&rdquo;
                </p>
              )}
              {storyContent.letterText && (
                <p className="whitespace-pre-wrap text-sm leading-relaxed">
                  {storyContent.letterText}
                </p>
              )}
            </div>

            {/* Climax Question */}
            <div className="text-center pb-6">
              <h3 className={`text-xl font-bold tracking-tight font-serif ${currentTheme.accent}`}>
                {storyContent.question || "Will you marry me?"}
              </h3>

              <div className="mt-6 flex flex-col gap-2">
                <button
                  type="button"
                  disabled
                  className="w-full cursor-not-allowed rounded-full bg-rose-600 py-3 text-sm font-bold text-white opacity-90 shadow-lg"
                >
                  YES, ALWAYS &amp; FOREVER 💍
                </button>
                <p className="text-[10px] opacity-60">Interactive response available on published URL</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
