import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

export type CorpusDoc = {
  id: string;
  title: string;
  relativePathFromRepoRoot: string;
};

const DOCS: CorpusDoc[] = [
  { id: "transcript", title: "Complete Transcript Collection", relativePathFromRepoRoot: "complete_brenner_transcript.md" },
  { id: "metaprompt", title: "Metaprompt (v0.2)", relativePathFromRepoRoot: "metaprompt_by_gpt_52.md" },
  { id: "initial-metaprompt", title: "Initial Metaprompt", relativePathFromRepoRoot: "initial_metaprompt.md" },
  { id: "distillation-gpt-52", title: "Final Distillation (GPT‑5.2)", relativePathFromRepoRoot: "final_distillation_of_brenner_method_by_gpt_52_extra_high_reasoning.md" },
  { id: "distillation-opus-45", title: "Final Distillation (Opus 4.5)", relativePathFromRepoRoot: "final_distillation_of_brenner_method_by_opus45.md" },
  { id: "distillation-gemini-3", title: "Final Distillation (Gemini 3)", relativePathFromRepoRoot: "final_distillation_of_brenner_method_by_gemini3.md" },
];

function repoRootFromWebCwd(): string {
  // In local dev, `process.cwd()` is typically `.../apps/web`.
  // We keep corpus docs at repo root, so resolve two levels up.
  return resolve(process.cwd(), "../..");
}

export async function listCorpusDocs(): Promise<CorpusDoc[]> {
  return DOCS;
}

export async function readCorpusDoc(id: string): Promise<{ doc: CorpusDoc; content: string }> {
  const doc = DOCS.find((d) => d.id === id);
  if (!doc) throw new Error(`Unknown doc: ${id}`);
  const repoRoot = repoRootFromWebCwd();
  const absPath = resolve(repoRoot, doc.relativePathFromRepoRoot);
  const content = await readFile(absPath, "utf8");
  return { doc, content };
}

