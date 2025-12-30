import Link from "next/link";

export default function Home() {
  const labModeValue = (process.env.BRENNER_LAB_MODE ?? "").trim().toLowerCase();
  const labModeEnabled = labModeValue === "1" || labModeValue === "true";

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <h1 className="text-3xl font-semibold tracking-tight">Brenner Bot Lab</h1>
        <p className="max-w-2xl text-muted-foreground">
          Research lab for operationalizing the Brenner method via multi-agent collaboration.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/corpus"
          className="rounded-xl border border-border bg-card p-5 shadow-sm transition hover:shadow-md hover:border-primary/30"
        >
          <div className="text-sm font-medium text-muted-foreground">Browse</div>
          <div className="mt-1 text-lg font-semibold text-card-foreground">Corpus</div>
          <div className="mt-2 text-sm text-muted-foreground">
            Read the complete Brenner transcript and metaprompts.
          </div>
        </Link>

        <Link
          href="/distillations"
          className="rounded-xl border border-border bg-card p-5 shadow-sm transition hover:shadow-md hover:border-primary/30"
        >
          <div className="text-sm font-medium text-muted-foreground">Compare</div>
          <div className="mt-1 text-lg font-semibold text-card-foreground">Distillations</div>
          <div className="mt-2 text-sm text-muted-foreground">
            Three model distillations of the Brenner method.
          </div>
        </Link>

        <Link
          href="/method"
          className="rounded-xl border border-border bg-card p-5 shadow-sm transition hover:shadow-md hover:border-primary/30"
        >
          <div className="text-sm font-medium text-muted-foreground">Learn</div>
          <div className="mt-1 text-lg font-semibold text-card-foreground">Method</div>
          <div className="mt-2 text-sm text-muted-foreground">
            The operators, loop, and Bayesian framework.
          </div>
        </Link>

        {labModeEnabled && (
          <Link
            href="/sessions/new"
            className="rounded-xl border border-primary/50 bg-primary/5 p-5 shadow-sm transition hover:shadow-md hover:bg-primary/10"
          >
            <div className="text-sm font-medium text-primary">Run</div>
            <div className="mt-1 text-lg font-semibold text-foreground">New Session</div>
            <div className="mt-2 text-sm text-muted-foreground">
              Compose a Brenner Loop kickoff prompt.
            </div>
          </Link>
        )}
      </section>
    </div>
  );
}
