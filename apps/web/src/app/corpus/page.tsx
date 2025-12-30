import Link from "next/link";
import { listCorpusDocs, isLabModeEnabled } from "@/lib/corpus";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export const runtime = "nodejs";

// Icons
const BookOpenIcon = () => (
  <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
  </svg>
);

const DocumentIcon = () => (
  <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
  </svg>
);

const SparklesIcon = () => (
  <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
  </svg>
);

const ArrowRightIcon = () => (
  <svg className="size-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
  </svg>
);

// Categorize documents
const categories = {
  primary: {
    title: "Primary Sources",
    description: "The original transcript collection from Sydney Brenner's interviews",
    icon: <BookOpenIcon />,
  },
  distillations: {
    title: "Model Distillations",
    description: "Frontier model analyses of Brenner's methodology",
    icon: <SparklesIcon />,
  },
  prompts: {
    title: "Metaprompts",
    description: "Structured prompts for applying the Brenner method",
    icon: <DocumentIcon />,
  },
};

function getCategory(id: string): keyof typeof categories {
  if (id.startsWith("distillation")) return "distillations";
  if (id.includes("metaprompt") || id === "quote-bank") return "prompts";
  return "primary";
}

function getReadTime(id: string): string {
  // Approximate read times based on document size
  const times: Record<string, string> = {
    transcript: "2+ hours",
    "quote-bank": "45 min",
    metaprompt: "10 min",
    "initial-metaprompt": "5 min",
    "distillation-gpt-52": "30 min",
    "distillation-opus-45": "45 min",
    "distillation-gemini-3": "20 min",
  };
  return times[id] || "15 min";
}

export default async function CorpusIndexPage() {
  const docs = await listCorpusDocs();
  const labModeEnabled = isLabModeEnabled();

  // Group by category
  const grouped = docs.reduce(
    (acc, doc) => {
      const cat = getCategory(doc.id);
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(doc);
      return acc;
    },
    {} as Record<keyof typeof categories, typeof docs>
  );

  return (
    <div className="space-y-12">
      {/* Header */}
      <header className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-12 rounded-xl bg-primary/10 text-primary">
            <BookOpenIcon />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Corpus</h1>
            <p className="text-muted-foreground">
              The complete Brenner document collection
            </p>
          </div>
        </div>
      </header>

      {/* Document Categories */}
      {(Object.keys(categories) as Array<keyof typeof categories>).map((categoryKey) => {
        const category = categories[categoryKey];
        const categoryDocs = grouped[categoryKey] || [];

        if (categoryDocs.length === 0) return null;

        return (
          <section key={categoryKey} className="space-y-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              {category.icon}
              <h2 className="text-lg font-semibold text-foreground">{category.title}</h2>
            </div>
            <p className="text-sm text-muted-foreground -mt-2 ml-7">
              {category.description}
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              {categoryDocs.map((doc, index) => {
                const locked = doc.access === "restricted" && !labModeEnabled;

                return (
                  <Link
                    key={doc.id}
                    href={`/corpus/${doc.id}`}
                    className={`group animate-fade-in-up stagger-${index + 1}`}
                  >
                    <Card
                      hover={!locked}
                      className={`h-full ${locked ? "opacity-70 hover:opacity-90" : ""}`}
                    >
                      <CardHeader>
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-1 flex-1">
                            <CardTitle className="group-hover:text-primary transition-colors">
                              {doc.title}
                            </CardTitle>
                            <CardDescription className="font-mono text-xs">
                              {doc.filename}
                            </CardDescription>
                            {locked && (
                              <div className="pt-2">
                                <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                                  <svg className="size-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 0h10.5A2.25 2.25 0 0119.5 12.75v6A2.25 2.25 0 0117.25 21H6.75A2.25 2.25 0 014.5 18.75v-6A2.25 2.25 0 016.75 10.5z" />
                                  </svg>
                                  Restricted
                                </span>
                              </div>
                            )}
                          </div>
                          {!locked && (
                            <div className="flex items-center gap-1 text-sm text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                              <span>Read</span>
                              <ArrowRightIcon />
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-4 pt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {locked ? "Restricted" : getReadTime(doc.id)}
                          </span>
                        </div>
                      </CardHeader>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })}

      {/* Quick Tips */}
      <section className="rounded-xl border bg-muted/30 p-6 space-y-3">
        <h3 className="font-semibold">Reading Tips</h3>
        <ul className="text-sm text-muted-foreground space-y-2">
          <li className="flex items-start gap-2">
            <span className="text-primary mt-1">1.</span>
            <span>Start with a <strong>Distillation</strong> for a structured overview of Brenner&apos;s methodology.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-1">2.</span>
            <span>Use the <strong>Quote Bank</strong> to find specific Brenner quotes on topics of interest.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-1">3.</span>
            <span>
              {labModeEnabled ? (
                <>Dive into the full <strong>Transcript</strong> for context and nuance around specific ideas.</>
              ) : (
                <>Use the <strong>Transcript excerpts</strong> in the Quote Bank to find anchorable primitives without reading the full corpus.</>
              )}
            </span>
          </li>
        </ul>
      </section>
    </div>
  );
}
