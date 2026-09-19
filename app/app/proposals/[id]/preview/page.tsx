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

  let storyContent: { question?: string; introMessage?: string; letterText?: string } = {};
  try {
    storyContent = JSON.parse(proposal.story_content);
  } catch {
    storyContent = {};
  }

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
    <div className="min-h-screen bg-neutral-100 py-8 dark:bg-neutral-900">
      <div className="mx-auto max-w-4xl px-4">
        {/* Navigation Bar */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link
              href={`/app/proposals/${proposal.id}`}
              className="text-sm font-medium text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
            >
              &larr; Back to Editor
            </Link>
            <span className="text-xs font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400">
              Studio Sandbox Preview
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                proposal.status === "PUBLISHED"
                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300"
                  : "bg-neutral-200 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-300"
              }`}
            >
              Status: {proposal.status}
            </span>
            <Link
              href={`/app/proposals/${proposal.id}/settings`}
              className="rounded-lg bg-neutral-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-700 dark:bg-neutral-700 dark:hover:bg-neutral-600"
            >
              Settings &amp; Publish
            </Link>
          </div>
        </div>

        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-center text-xs text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-300">
          <strong>Creator Sandbox:</strong> This is an authentic preview of how your proposal appears to your recipient. No live response can be recorded in preview mode.
        </div>

        {/* Mobile Viewport Simulation Frame */}
        <div className="mx-auto max-w-sm rounded-[2.5rem] border-8 border-neutral-800 bg-neutral-900 p-2 shadow-2xl">
          <div className={`relative flex min-h-[600px] flex-col justify-between overflow-hidden rounded-[2rem] p-6 ${currentTheme.bg} ${currentTheme.text}`}>
            {/* Top decorative element */}
            <div className="text-center pt-4">
              <div className="mx-auto mb-2 h-1 w-12 rounded-full bg-neutral-600/40" />
              <p className="text-xs font-medium uppercase tracking-widest opacity-70">
                A Special Message For
              </p>
              <h2 className={`mt-1 text-2xl font-bold tracking-tight ${currentTheme.accent}`}>
                {proposal.partner_name}
              </h2>
            </div>

            {/* Story Letter */}
            <div className={`my-6 space-y-4 rounded-2xl border p-5 backdrop-blur-sm ${currentTheme.card}`}>
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
              <h3 className={`text-xl font-bold tracking-tight ${currentTheme.accent}`}>
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
                <p className="text-[10px] opacity-60">Interactive response available only on published URL</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
