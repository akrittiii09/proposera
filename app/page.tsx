import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 text-center bg-neutral-50 dark:bg-neutral-950">
      <div className="max-w-md space-y-4 rounded-xl border border-neutral-200 bg-white p-8 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
          Proposera
        </h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Personalized romantic proposal-experience platform.
        </p>
        <div className="inline-block rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
          Production Ready &bull; Live Experiences
        </div>
        <div className="flex justify-center gap-3 pt-2">
          <Link
            href="/login"
            className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2"
          >
            Create Account
          </Link>
        </div>
      </div>
    </main>
  );
}
