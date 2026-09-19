export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 text-center">
      <div className="max-w-md space-y-4 rounded-xl border border-neutral-200 p-8 shadow-sm dark:border-neutral-800">
        <h1 className="text-2xl font-semibold tracking-tight">Proposera</h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Personalized proposal-experience platform.
        </p>
        <div className="inline-block rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200">
          Phase 0: Engineering Foundation Active
        </div>
      </div>
    </main>
  );
}
