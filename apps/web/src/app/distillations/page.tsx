import Link from "next/link";

export default function DistillationsPage() {
  const distillations = [
    {
      model: "Opus 4.5",
      docId: "distillation-opus-45",
      color: "opus",
      description: "Frames the method through two axioms and epistemic modesty.",
    },
    {
      model: "GPT 5.2",
      docId: "distillation-gpt-52",
      color: "gpt",
      description: "Emphasizes the objective function and optimization lens.",
    },
    {
      model: "Gemini 3",
      docId: "distillation-gemini-3",
      color: "gemini",
      description: "Identifies a minimal Brenner Kernel of essential moves.",
    },
  ] as const;

  const badgeClassByColor = {
    opus: "bg-opus/10 text-opus-foreground",
    gpt: "bg-gpt/10 text-gpt-foreground",
    gemini: "bg-gemini/10 text-gemini-foreground",
  } as const;

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <h1 className="text-3xl font-semibold tracking-tight">Distillations</h1>
        <p className="max-w-2xl text-muted-foreground">
          Three frontier models distilled the Brenner method from the same transcript.
          Each brings a different lens to the material.
        </p>
      </section>

      <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {distillations.map((d) => (
          <Link
            key={d.model}
            href={`/corpus/${d.docId}`}
            className="group rounded-xl border border-border bg-card p-6 shadow-sm transition hover:shadow-md hover:border-primary/30"
          >
            <div
              className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${badgeClassByColor[d.color]}`}
            >
              {d.model}
            </div>
            <p className="mt-3 text-sm text-muted-foreground">{d.description}</p>
            <div className="mt-4 text-sm font-medium text-primary group-hover:underline">
              Read distillation
            </div>
          </Link>
        ))}
      </section>

      <section className="rounded-xl border border-border bg-muted/30 p-6">
        <h2 className="text-lg font-semibold">What stays the same?</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Despite different framings, all three models converge on core invariants:
          parallel exploration, discriminative tests, Bayesian updating, and
          the primacy of empirical constraint over theoretical elegance.
        </p>
      </section>
    </div>
  );
}
