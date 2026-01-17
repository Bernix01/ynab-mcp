export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-center gap-12 py-16 px-8 bg-white dark:bg-black">
        {/* Header skeleton */}
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="h-10 w-64 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
          <div className="h-6 w-80 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
        </div>

        <div className="flex flex-col items-center gap-6 w-full max-w-md">
          {/* Features card skeleton */}
          <div className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
            <div className="h-6 w-24 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse mb-4" />
            <div className="space-y-3">
              <div className="h-4 w-48 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
              <div className="h-4 w-40 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
              <div className="h-4 w-52 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
              <div className="h-4 w-44 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
              <div className="h-4 w-48 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
            </div>
          </div>

          {/* Buttons skeleton */}
          <div className="flex flex-col gap-3 w-full">
            <div className="h-12 w-full bg-zinc-200 dark:bg-zinc-800 rounded-full animate-pulse" />
            <div className="h-12 w-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-full animate-pulse" />
          </div>
        </div>

        {/* Footer text skeleton */}
        <div className="h-4 w-72 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
      </main>
    </div>
  );
}
