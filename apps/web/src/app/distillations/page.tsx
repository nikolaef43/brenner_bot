import Link from "next/link";

export default function DistillationsPage() {
  const distillations = [
    {
      model: "Opus 4.5",
      file: "final_distillation_of_brenner_method_by_opus45.md",
      color: "opus",
      description: "Frames the method through two axioms and epistemic modesty.",
    },
    {
      model: "GPT 5.2",
      file: "final_distillation_of_brenner_method_by_gpt_52_extra_high_reasoning.md",
      color: "gpt",
      description: "Emphasizes the objective function and optimization lens.",
    },
    {
      model: "Gemini 3",
      file: "final_distillation_of_brenner_method_by_gemini3.md",
      color: "gemini",
      description: "Identifies a minimal Brenner Kernel of essential moves.",
    },
  ] as const;

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
            href={`/corpus/${encodeURIComponent(d.file)}`}
            className="group rounded-xl border border-border bg-card p-6 shadow-sm transition hover:shadow-md hover:border-primary/30"
          >
            <div
              className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium bg-${d.color}/10 text-${d.color}-foreground`}
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
