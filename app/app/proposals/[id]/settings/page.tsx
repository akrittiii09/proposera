import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth/requireAuth";
import { getDb } from "@/lib/db";
import { findProposalById, isCreatorEntitled } from "@/lib/db/repositories";
import ProposalSettingsClient from "@/components/proposals/ProposalSettingsClient";

interface ProposalSettingsPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function ProposalSettingsPage({ params }: ProposalSettingsPageProps) {
  const { creator } = await requireAuth();
  const { id } = await params;

  const db = getDb();
  const proposal = findProposalById(db, id);

  // Security guard: 404 non-disclosure for unowned or deleted proposals
  if (!proposal || proposal.creator_id !== creator.id || proposal.status === "DELETED") {
    notFound();
  }

  const entitled = isCreatorEntitled(db, creator.id);

  return <ProposalSettingsClient proposal={proposal} isEntitled={entitled} />;
}
