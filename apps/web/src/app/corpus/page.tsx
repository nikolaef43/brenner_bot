import Link from "next/link";
import { listCorpusDocs } from "@/lib/corpus";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Corpus",
  description: "The complete Brenner document collection - transcripts, distillations, and metaprompts.",
};

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

const ClockIcon = () => (
  <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

// Categorize documents
const categories = {
  primary: {
    title: "Primary Sources",
    description: "The original transcript collection from Sydney Brenner's Web of Stories interviews",
    icon: <BookOpenIcon />,
  },
  distillations: {
    title: "Model Distillations",
    description: "Frontier model analyses of Brenner's methodology - three different perspectives",
    icon: <SparklesIcon />,
  },
  prompts: {
    title: "Metaprompts & Reference",
    description: "Structured prompts and curated quotes for applying the Brenner method",
    icon: <DocumentIcon />,
  },
};

function getCategory(id: string): keyof typeof categories {
  if (id.startsWith("distillation")) return "distillations";
  if (id.includes("metaprompt") || id === "quote-bank") return "prompts";
  return "primary";
}

function getReadTime(id: string): string {
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
    <div className="space-y-8 sm:space-y-12">
      {/* Header */}
      <header className="space-y-3 sm:space-y-4 animate-fade-in-up">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-10 sm:size-12 rounded-xl bg-primary/10 text-primary">
            <BookOpenIcon />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Corpus</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
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
          <section key={categoryKey} className="space-y-3 sm:space-y-4 animate-fade-in-up">
            <div className="flex items-center gap-2 text-muted-foreground">
              {category.icon}
              <h2 className="text-base sm:text-lg font-semibold text-foreground">{category.title}</h2>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground -mt-1.5 sm:-mt-2 ml-7">
              {category.description}
            </p>

            <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
              {categoryDocs.map((doc, index) => (
                <Link
                  key={doc.id}
                  href={`/corpus/${doc.id}`}
                  className={`group animate-fade-in-up stagger-${index + 1} touch-manipulation`}
                >
                  <Card hover className="h-full active:scale-[0.98] transition-transform">
                    <CardHeader className="p-4 sm:p-6">
                      <div className="flex items-start justify-between gap-3 sm:gap-4">
                        <div className="space-y-1 sm:space-y-1.5 flex-1 min-w-0">
                          <CardTitle className="text-base sm:text-lg group-hover:text-primary transition-colors">
                            {doc.title}
                          </CardTitle>
                          {doc.description && (
                            <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
                              {doc.description}
                            </p>
                          )}
                          <CardDescription className="font-mono text-xs truncate">
                            {doc.filename}
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-1 text-xs sm:text-sm text-muted-foreground sm:opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          <span className="hidden sm:inline">Read</span>
                          <ArrowRightIcon />
                        </div>
                      </div>
                      <div className="flex items-center gap-3 sm:gap-4 pt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <ClockIcon />
                          {getReadTime(doc.id)}
                        </span>
                      </div>
                    </CardHeader>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        );
      })}

      {/* Quick Tips */}
      <section className="rounded-xl border bg-muted/30 p-4 sm:p-6 space-y-2 sm:space-y-3 animate-fade-in-up">
        <h3 className="text-sm sm:text-base font-semibold">Reading Tips</h3>
        <ul className="text-xs sm:text-sm text-muted-foreground space-y-1.5 sm:space-y-2">
          <li className="flex items-start gap-2">
            <span className="text-primary mt-0.5 font-semibold">1.</span>
            <span>Start with a <strong>Distillation</strong> for a structured overview of Brenner&apos;s methodology.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-0.5 font-semibold">2.</span>
            <span>Use the <strong>Quote Bank</strong> to find specific Brenner quotes on topics of interest.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-0.5 font-semibold">3.</span>
            <span>Dive into the full <strong>Transcript</strong> for context and nuance around specific ideas.</span>
          </li>
        </ul>
      </section>
    </div>
  );
}
