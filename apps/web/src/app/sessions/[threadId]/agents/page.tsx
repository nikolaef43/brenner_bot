import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Agent Tribunal",
  description: "Multi-agent synthesis for research hypothesis refinement.",
};

interface PageProps {
  params: Promise<{ threadId: string }>;
}

function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
    </svg>
  );
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  );
}

const AGENTS = [
  {
    name: "Devil's Advocate",
    role: "Challenger",
    description: "Actively challenges hypotheses and finds weaknesses",
    color: "text-red-500",
    bgColor: "bg-red-500/10",
  },
  {
    name: "Experiment Designer",
    role: "Methodologist",
    description: "Designs discriminative tests between hypotheses",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  {
    name: "Brenner Channeler",
    role: "Mentor",
    description: "Channels Sydney Brenner's scientific wisdom",
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
  },
];

export default async function AgentsPage({ params }: PageProps) {
  const { threadId } = await params;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground animate-fade-in-up">
        <Link
          href="/sessions"
          className="hover:text-foreground transition-colors"
        >
          Sessions
        </Link>
        <span>/</span>
        <Link
          href={`/sessions/${threadId}`}
          className="hover:text-foreground transition-colors font-mono"
        >
          {threadId.slice(0, 12)}...
        </Link>
        <span>/</span>
        <span className="text-foreground">Agent Tribunal</span>
      </nav>

      {/* Back link */}
      <Link
        href={`/sessions/${threadId}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors group"
      >
        <ChevronLeftIcon className="size-4 group-hover:-translate-x-0.5 transition-transform" />
        Back to Session
      </Link>

      {/* Header */}
      <header className="animate-fade-in-up">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex items-center justify-center size-10 rounded-xl bg-primary/10 text-primary">
            <UsersIcon className="size-5" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Agent Tribunal</h1>
        </div>
        <p className="text-muted-foreground">
          Multi-agent synthesis for rigorous hypothesis refinement.
        </p>
      </header>

      {/* Agent Cards */}
      <div className="space-y-4">
        {AGENTS.map((agent, index) => (
          <div
            key={agent.name}
            className={`rounded-xl border border-border bg-card p-5 hover:border-primary/30 transition-all animate-fade-in-up stagger-${index + 2}`}
          >
            <div className="flex items-start gap-4">
              <div className={`flex items-center justify-center size-12 rounded-xl ${agent.bgColor} ${agent.color}`}>
                <UsersIcon className="size-6" />
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-foreground">{agent.name}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${agent.bgColor} ${agent.color}`}>
                    {agent.role}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{agent.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Placeholder */}
      <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-8 text-center animate-fade-in-up stagger-5">
        <p className="text-sm text-muted-foreground">
          Agent interaction panel coming soon. Agents coordinate via Agent Mail.
        </p>
      </div>
    </div>
  );
}
