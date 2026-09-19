import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth/requireAuth";
import { getDb } from "@/lib/db";
import { findProposalById } from "@/lib/db/repositories";
import ProposalEditor from "@/components/proposals/ProposalEditor";

interface ProposalEditorPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function ProposalEditorPage({ params }: ProposalEditorPageProps) {
  const { creator } = await requireAuth();
  const { id } = await params;

  const db = getDb();
  const proposal = findProposalById(db, id);

  // Security & non-disclosure: 404 if not found, not owned, or deleted
  if (!proposal || proposal.creator_id !== creator.id || proposal.status === "DELETED") {
    notFound();
  }

  return <ProposalEditor proposal={proposal} />;
}
