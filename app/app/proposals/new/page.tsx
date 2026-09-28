import { requireAuth } from "@/lib/auth/requireAuth";
import NewProposalForm from "@/components/proposals/NewProposalForm";

export const metadata = {
  title: "New Proposal | Proposera Creator Studio",
  description: "Initialize a new romantic proposal",
};

export default async function NewProposalPage() {
  await requireAuth();

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50/60 p-4 sm:p-6 lg:p-8 text-slate-900">
      <NewProposalForm />
    </div>
  );
}
