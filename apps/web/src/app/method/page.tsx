import Link from "next/link";

export default function MethodPage() {
  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <h1 className="text-3xl font-semibold tracking-tight">Method</h1>
        <p className="max-w-2xl text-muted-foreground">
          This section will make the Brenner operators and loop executable in UI. For now, start with the
          transcript and the three distillations.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/corpus"
          className="rounded-xl border border-border bg-card p-5 shadow-sm transition hover:shadow-md hover:border-primary/30"
        >
          <div className="text-sm font-medium text-muted-foreground">Read</div>
          <div className="mt-1 text-lg font-semibold text-card-foreground">Corpus</div>
          <div className="mt-2 text-sm text-muted-foreground">Primary sources with stable § anchors.</div>
        </Link>

        <Link
          href="/distillations"
          className="rounded-xl border border-border bg-card p-5 shadow-sm transition hover:shadow-md hover:border-primary/30"
        >
          <div className="text-sm font-medium text-muted-foreground">Compare</div>
          <div className="mt-1 text-lg font-semibold text-card-foreground">Distillations</div>
          <div className="mt-2 text-sm text-muted-foreground">Three incompatible compressions of the same corpus.</div>
        </Link>
      </section>

      <section className="rounded-xl border border-border bg-muted/30 p-6">
        <h2 className="text-lg font-semibold">Planned</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Operator palette, Brenner Loop walkthrough, and Bayesian crosswalk. Track progress in Beads
          (web method + operators visualization).
        </p>
      </section>
    </div>
  );
}
