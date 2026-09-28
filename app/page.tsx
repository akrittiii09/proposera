import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col justify-between">
      {/* Navigation Header */}
      <header className="border-b border-slate-100 bg-white/80 backdrop-blur-md sticky top-0 z-30">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" className="flex items-center space-x-2 text-xl font-bold tracking-tight text-slate-900">
            <span className="text-2xl">💍</span>
            <span>Proposera</span>
          </Link>

          <div className="flex items-center space-x-3">
            <Link
              href="/login"
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition hover:text-slate-900 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-rose-500"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="mx-auto max-w-4xl px-4 pt-16 pb-20 sm:px-6 text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50/80 px-3.5 py-1 text-xs font-semibold text-rose-700 shadow-sm mb-6">
            <span>✨</span>
            <span>100% Free Forever &bull; Zero Paywalls</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 font-serif leading-[1.15]">
            Orchestrate an Unforgettable <br className="hidden sm:inline" />
            <span className="text-rose-600">Digital Proposal</span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base sm:text-lg text-slate-600 leading-relaxed">
            Craft an intimate, personalized digital journey for your partner.
            Share your love story, curate memories, and ask life&apos;s biggest question
            with cinematic atmosphere and emotional depth.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/register"
              className="w-full sm:w-auto rounded-xl bg-rose-600 px-7 py-3.5 text-sm font-bold text-white shadow-md shadow-rose-600/20 transition hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2 text-center"
            >
              Create Your Proposal &rarr;
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto rounded-xl border border-slate-300 bg-white px-7 py-3.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400 text-center"
            >
              Sign In to Studio
            </Link>
          </div>

          <p className="mt-4 text-xs text-slate-400 font-medium">
            No credit card required &bull; Live instant publishing &bull; Private &amp; secure
          </p>
        </section>

        {/* Feature Cards Grid */}
        <section className="border-t border-slate-100 bg-slate-50/50 py-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="text-center mb-12">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 font-serif">
                Thoughtfully Designed for Romance
              </h2>
              <p className="mt-2 text-sm text-slate-600 max-w-xl mx-auto">
                Everything you need to orchestrate a breathtaking proposal experience that feels personal, dignified, and memorable.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {/* Feature 1 */}
              <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-2xl mb-4">
                  💌
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-2">
                  5-Scene Emotional Pacing
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Guide your partner through opening words, your love story, the climax question, and an unhurried, heartfelt celebration.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-2xl mb-4">
                  🎵
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-2">
                  Ambient Music Engine
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Curated royalty-free soundtracks with gentle fade-in upon interaction, persistent volume control, and graceful mobile autoplay fallback.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-2xl mb-4">
                  🔒
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-2">
                  Privacy &amp; EXIF Stripping
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Your uploaded memories are automatically stripped of GPS and EXIF metadata, converted to high-efficiency WebP, and protected with non-disclosure guards.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Free Publishing Highlight Banner */}
        <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
          <div className="rounded-3xl border border-rose-200 bg-gradient-to-br from-rose-50/60 to-white p-8 sm:p-12 text-center shadow-sm">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 font-serif">
              Ready to ask life&apos;s biggest question?
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-slate-600 leading-relaxed">
              Create, preview, and publish your custom proposal in minutes. Completely free, with zero paywalls and live mutable updates.
            </p>
            <div className="mt-6 flex justify-center">
              <Link
                href="/register"
                className="rounded-xl bg-rose-600 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-rose-600/20 transition hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2"
              >
                Begin Your Proposal Story &rarr;
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-100 bg-white py-8 text-center text-xs text-slate-500">
        <div className="mx-auto max-w-6xl px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-slate-800">Proposera</span>
            <span>&bull;</span>
            <span>Intimate Proposal Journeys</span>
          </div>
          <div className="flex space-x-4">
            <Link href="/login" className="hover:text-slate-900">Sign In</Link>
            <Link href="/register" className="hover:text-slate-900">Register</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
