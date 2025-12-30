export default function MethodPage() {
  const operators = [
    {
      name: "Parallel Exploration",
      description: "Run multiple hypotheses simultaneously rather than committing to one.",
    },
    {
      name: "Discriminative Tests",
      description: "Design experiments that distinguish between competing hypotheses.",
    },
    {
      name: "Assumption Ledger",
      description: "Track implicit assumptions and test them explicitly.",
    },
    {
      name: "Bayesian Updating",
      description: "Adjust confidence based on evidence, not attachment.",
    },
    {
      name: "Selective Pruning",
      description: "Kill hypotheses that fail tests; don't keep them on life support.",
    },
    {
      name: "Surprise as Signal",
      description: "Unexpected results are information, not failures.",
    },
  ];

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <h1 className="text-3xl font-semibold tracking-tight">The Brenner Method</h1>
        <p className="max-w-2xl text-muted-foreground">
          A research methodology distilled from Sydney Brenner&apos;s approach to molecular biology.
          Not a rigid protocol, but a set of moves that compound over time.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Core Operators</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {operators.map((op) => (
            <div
              key={op.name}
              className="rounded-lg border border-border bg-card p-4"
            >
              <h3 className="font-medium text-card-foreground">{op.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{op.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">The Loop</h2>
        <div className="rounded-xl border border-border bg-muted/30 p-6">
          <ol className="space-y-3 text-sm text-muted-foreground">
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">1</span>
              <span>Generate multiple competing hypotheses from current evidence.</span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">2</span>
              <span>Design discriminative tests that can distinguish between them.</span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">3</span>
              <span>Run tests, observe outcomes, update beliefs proportionally.</span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">4</span>
              <span>Prune hypotheses that fail; promote those that survive.</span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">5</span>
              <span>Repeat until convergence or new questions emerge.</span>
            </li>
          </ol>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Why It Works</h2>
        <p className="text-sm text-muted-foreground">
          The method prevents premature commitment to a single hypothesis.
          By maintaining multiple candidates and actively seeking disconfirming evidence,
          you avoid the trap of confirmation bias and the sunk-cost fallacy.
          Brenner called this &ldquo;working out of phase&rdquo;&mdash;staying one step
          ahead of the field by not following the crowd.
        </p>
      </section>
    </div>
  );
}
