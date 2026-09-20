import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth/requireAuth";
import { getDb } from "@/lib/db";
import {
  findProposalById,
  findResponsesByProposalId,
} from "@/lib/db/repositories";
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

  const rawResponses = findResponsesByProposalId(db, id, creator.id) || [];

  const initialResponses = rawResponses.map((r) => ({
    id: r.id,
    choice: r.choice,
    custom_note: r.custom_note,
    created_at: r.created_at,
  }));

  return (
    <ProposalSettingsClient
      proposal={proposal}
      initialResponses={initialResponses}
    />
  );
}
