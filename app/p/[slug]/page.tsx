import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDb } from "@/lib/db";
import {
  findPublishedProposalBySlug,
  getPublicProjection,
} from "@/lib/db/repositories";
import SceneOrchestrator from "@/components/scenes/SceneOrchestrator";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface RecipientPageProps {
  params: Promise<{
    slug: string;
  }>;
}

/**
 * Search engine protection: Prevent search engines and social crawlers
 * from indexing intimate proposals or caching sensitive previews.
 */
export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "A Special Proposal | Proposera",
    robots: {
      index: false,
      follow: false,
      nocache: true,
      googleBot: {
        index: false,
        follow: false,
        noimageindex: true,
      },
    },
    other: {
      "X-Robots-Tag": "noindex, nofollow, noarchive, nosnippet",
    },
  };
}

/**
 * /p/[slug]
 * Dedicated, distraction-free public recipient presentation route.
 * Public and unauthenticated.
 * Enforces strict 404 non-disclosure for drafts, unpublished, or non-existent proposals.
 */
export default async function RecipientPage({ params }: RecipientPageProps) {
  const { slug } = await params;
  const db = getDb();

  // Non-disclosure: resolve ONLY published proposals
  const proposal = findPublishedProposalBySlug(db, slug);

  if (!proposal || proposal.status !== "PUBLISHED") {
    notFound();
  }

  // Filter raw database row strictly into the sanitized Public Projection allowlist:
  // (slug, title, partner_name, theme_id, custom_theme_overrides, story_content)
  const projection = getPublicProjection(proposal);

  return <SceneOrchestrator proposal={projection} isInteractive={true} />;
}
