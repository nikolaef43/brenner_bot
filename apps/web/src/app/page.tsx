import Link from "next/link";

export default function Home() {
  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <h1 className="text-3xl font-semibold tracking-tight">Brenner Bot Lab</h1>
        <p className="max-w-2xl text-zinc-700 dark:text-zinc-300">
          Documents-first corpus + syntheses, evolving into a multi-agent “research lab” coordinated via Agent Mail.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/corpus"
          className="rounded-xl border border-black/10 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-white/10 dark:bg-zinc-950"
        >
          <div className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Browse</div>
          <div className="mt-1 text-lg font-semibold">Corpus</div>
          <div className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">
            Read the transcript, metaprompts, and model distillations.
          </div>
        </Link>

        <Link
          href="/sessions/new"
          className="rounded-xl border border-black/10 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-white/10 dark:bg-zinc-950"
        >
          <div className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Run</div>
          <div className="mt-1 text-lg font-semibold">New Session</div>
          <div className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">
            Compose a Brenner Loop kickoff prompt and send it to agents via Agent Mail.
          </div>
        </Link>
      </section>
    </div>
  );
}
