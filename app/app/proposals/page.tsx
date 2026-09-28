import Link from "next/link";
import { requireAuth } from "@/lib/auth/requireAuth";
import { getDb } from "@/lib/db";
import { findProposalsByCreatorId } from "@/lib/db/repositories";
import LogoutButton from "@/components/auth/LogoutButton";

export const metadata = {
  title: "Proposals Dashboard | Proposera Creator Studio",
  description: "Manage your romantic proposal experiences",
};

export default async function ProposalsDashboardPage() {
  const { creator } = await requireAuth();
  const db = getDb();

  const proposals = findProposalsByCreatorId(db, creator.id);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PUBLISHED":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
            Published (Live)
          </span>
        );
      case "UNPUBLISHED":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 border border-amber-200">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
            Unpublished
          </span>
        );
      case "ARCHIVED":
        return (
          <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600 border border-slate-200">
            Archived
          </span>
        );
      case "DRAFT":
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-700 border border-rose-200">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-500"></span>
            Draft
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-900">
      {/* Header / Navigation */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-20 shadow-xs">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3.5 sm:px-6">
          <div className="flex items-center space-x-3">
            <Link href="/" className="flex items-center space-x-2 text-lg font-bold tracking-tight text-slate-900">
              <span className="text-xl">💍</span>
              <span className="font-serif">Proposera</span>
            </Link>
            <span className="rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-medium text-rose-700 border border-rose-200/60">
              Creator Studio
            </span>
          </div>

          <div className="flex items-center space-x-4">
            <span className="hidden text-xs text-slate-500 sm:inline font-mono">
              {creator.email}
            </span>
            <LogoutButton />
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        {/* Proposals Section Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-serif">
              My Proposals
            </h1>
            <p className="mt-1 text-xs text-slate-500">
              Proposals created, authored, and managed under your account
            </p>
          </div>

          <Link
            href="/app/proposals/new"
            className="inline-flex items-center justify-center rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2"
          >
            + Create Proposal
          </Link>
        </div>

        {/* Proposals List or Empty State */}
        {proposals.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-xs">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 text-2xl text-rose-600 border border-rose-100">
              💍
            </div>
            <h2 className="text-base font-bold text-slate-900 font-serif">
              No proposals created yet
            </h2>
            <p className="mx-auto mt-1 max-w-sm text-xs text-slate-500 leading-relaxed">
              Ready to create something unforgettable? Click below to begin authoring your custom romantic proposal story.
            </p>
            <div className="mt-5">
              <Link
                href="/app/proposals/new"
                className="inline-flex items-center rounded-xl bg-rose-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-rose-700 transition-colors"
              >
                Start New Proposal &rarr;
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {proposals.map((proposal) => (
              <div
                key={proposal.id}
                className="flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs hover:shadow-md transition-shadow"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="text-base font-bold text-slate-900 font-serif line-clamp-1">
                      {proposal.title}
                    </h2>
                    {getStatusBadge(proposal.status)}
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    For Partner:{" "}
                    <span className="font-semibold text-slate-800">
                      {proposal.partner_name}
                    </span>
                  </p>
                  {proposal.status === "PUBLISHED" ? (
                    <a
                      href={`/p/${proposal.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-1 font-mono text-xs text-rose-600 hover:text-rose-700 hover:underline"
                      title="Open live proposal"
                    >
                      /p/{proposal.slug} ↗
                    </a>
                  ) : (
                    <p className="mt-2 text-xs text-slate-400 font-mono">
                      /p/{proposal.slug}
                    </p>
                  )}
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-3">
                  <div className="text-xs text-slate-400 font-mono">
                    <span>{new Date(proposal.created_at).toLocaleDateString()}</span>
                  </div>

                  <div className="flex items-center space-x-1.5">
                    {proposal.status === "PUBLISHED" && (
                      <a
                        href={`/p/${proposal.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 hover:bg-emerald-100 transition-colors"
                        title="View live proposal in new tab"
                      >
                        Live ↗
                      </a>
                    )}
                    <Link
                      href={`/app/proposals/${proposal.id}`}
                      className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      Edit
                    </Link>
                    <Link
                      href={`/app/proposals/${proposal.id}/preview`}
                      className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      Preview
                    </Link>
                    <Link
                      href={`/app/proposals/${proposal.id}/settings`}
                      className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      Settings
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
