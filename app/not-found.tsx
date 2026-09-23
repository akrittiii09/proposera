import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Proposal Unavailable | Proposera",
  robots: {
    index: false,
    follow: false,
  },
};

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex flex-col justify-center items-center bg-slate-950 text-slate-100 px-4 py-12 text-center">
      <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-3xl shadow-inner mb-6">
        💌
      </div>
      <h1 className="text-2xl sm:text-3xl font-bold font-serif tracking-tight text-white mb-2">
        Proposal Unavailable
      </h1>
      <p className="text-sm sm:text-base text-slate-400 max-w-sm mx-auto mb-8 leading-relaxed">
        This proposal may be private, not yet published, or no longer available.
      </p>
      <Link
        href="/"
        className="rounded-full bg-rose-600 px-6 py-3 text-xs font-semibold text-white shadow-lg shadow-rose-950/50 hover:bg-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:ring-offset-2 focus:ring-offset-slate-950 transition-colors"
      >
        &larr; Return to Proposera
      </Link>
      <footer className="mt-16 text-[11px] font-mono text-slate-600">
        Proposera &bull; Thoughtful Proposal Stories
      </footer>
    </div>
  );
}
