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
    <div className="min-h-screen w-full flex flex-col justify-center items-center bg-slate-50/60 text-slate-900 px-4 py-12 text-center">
      <div className="max-w-md w-full bg-white border border-slate-200 shadow-sm rounded-3xl p-8 sm:p-10 text-center">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-3xl shadow-xs mx-auto mb-6">
          💌
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold font-serif tracking-tight text-slate-900 mb-2">
          Proposal Unavailable
        </h1>
        <p className="text-sm text-slate-600 max-w-sm mx-auto mb-8 leading-relaxed">
          This proposal may be private, not yet published, or no longer available.
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-xl bg-rose-600 px-6 py-3 text-xs font-bold text-white shadow-sm hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2 transition-colors"
        >
          &larr; Return to Proposera
        </Link>
        <div className="mt-8 pt-6 border-t border-slate-100 text-[11px] font-mono text-slate-400">
          Proposera &bull; Thoughtful Proposal Stories
        </div>
      </div>
    </div>
  );
}
