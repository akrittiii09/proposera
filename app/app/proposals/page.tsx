import Link from "next/link";
import { requireAuth } from "@/lib/auth/requireAuth";
import { getDb } from "@/lib/db";
import {
  findProposalsByCreatorId,
} from "@/lib/db/repositories";
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
          <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
            Published (Live)
          </span>
        );
      case "UNPUBLISHED":
        return (
          <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
            Unpublished
          </span>
        );
      case "ARCHIVED":
        return (
          <span className="inline-flex items-center rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-semibold text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
            Archived
          </span>
        );
      case "DRAFT":
      default:
        return (
          <span className="inline-flex items-center rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
            Draft
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      {/* Header / Navigation */}
      <header className="border-b border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center space-x-3">
            <span className="text-lg font-bold tracking-tight text-neutral-900 dark:text-white">
              Proposera
            </span>
            <span className="rounded-md bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
              Creator Studio
            </span>
          </div>

          <div className="flex items-center space-x-4">
            <span className="hidden text-xs text-neutral-500 sm:inline dark:text-neutral-400">
              {creator.email}
            </span>
            <LogoutButton />
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">

        {/* Proposals Section */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-white">
              My Proposals
            </h1>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Proposals created and managed under your account
            </p>
          </div>

          <Link
            href="/app/proposals/new"
            className="inline-flex items-center rounded-lg bg-rose-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2"
          >
            + Create Proposal
          </Link>
        </div>

        {/* Proposals List or Empty State */}
        {proposals.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-neutral-300 p-12 text-center dark:border-neutral-800">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400">
              💍
            </div>
            <h2 className="text-base font-semibold text-neutral-900 dark:text-white">
              No proposals created yet
            </h2>
            <p className="mx-auto mt-1 max-w-sm text-xs text-neutral-500 dark:text-neutral-400">
              Ready to create something unforgettable? Click the button above to begin authoring your proposal story.
            </p>
            <div className="mt-4">
              <Link
                href="/app/proposals/new"
                className="inline-flex items-center rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-rose-700"
              >
                Start Proposal
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {proposals.map((proposal) => (
              <div
                key={proposal.id}
                className="flex flex-col justify-between rounded-xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="text-base font-semibold text-neutral-900 dark:text-white">
                      {proposal.title}
                    </h2>
                    {getStatusBadge(proposal.status)}
                  </div>
                  <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                    For Partner:{" "}
                    <span className="font-medium text-neutral-800 dark:text-neutral-200">
                      {proposal.partner_name}
                    </span>
                  </p>
                  {proposal.status === "PUBLISHED" ? (
                    <a
                      href={`/p/${proposal.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-flex items-center gap-1 font-mono text-xs text-rose-600 hover:underline dark:text-rose-400"
                      title="Open live proposal"
                    >
                      /p/{proposal.slug} ↗
                    </a>
                  ) : (
                    <p className="mt-1 text-xs text-neutral-400 font-mono">
                      /p/{proposal.slug}
                    </p>
                  )}
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-neutral-100 pt-3 dark:border-neutral-800">
                  <div className="text-xs text-neutral-400">
                    <span>{new Date(proposal.created_at).toLocaleDateString()}</span>
                  </div>

                  <div className="flex items-center space-x-2">
                    {proposal.status === "PUBLISHED" && (
                      <a
                        href={`/p/${proposal.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 dark:hover:bg-emerald-900/60"
                        title="View live proposal in new tab"
                      >
                        Live ↗
                      </a>
                    )}
                    <Link
                      href={`/app/proposals/${proposal.id}`}
                      className="rounded border border-neutral-200 px-2.5 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
                    >
                      Edit
                    </Link>
                    <Link
                      href={`/app/proposals/${proposal.id}/preview`}
                      className="rounded border border-neutral-200 px-2.5 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
                    >
                      Preview
                    </Link>
                    <Link
                      href={`/app/proposals/${proposal.id}/settings`}
                      className="rounded border border-neutral-200 px-2.5 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
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
