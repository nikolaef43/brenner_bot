import { readFile, access } from "node:fs/promises";
import { resolve } from "node:path";

export type CorpusDoc = {
  id: string;
  title: string;
  filename: string;
};

export const CORPUS_DOCS: CorpusDoc[] = [
  { id: "transcript", title: "Complete Transcript Collection", filename: "complete_brenner_transcript.md" },
  { id: "quote-bank", title: "Quote Bank (Verbatim Primitives)", filename: "quote_bank_restored_primitives.md" },
  { id: "metaprompt", title: "Metaprompt (v0.2)", filename: "metaprompt_by_gpt_52.md" },
  { id: "initial-metaprompt", title: "Initial Metaprompt", filename: "initial_metaprompt.md" },
  { id: "distillation-gpt-52", title: "Final Distillation (GPT‑5.2)", filename: "final_distillation_of_brenner_method_by_gpt_52_extra_high_reasoning.md" },
  { id: "distillation-opus-45", title: "Final Distillation (Opus 4.5)", filename: "final_distillation_of_brenner_method_by_opus45.md" },
  { id: "distillation-gemini-3", title: "Final Distillation (Gemini 3)", filename: "final_distillation_of_brenner_method_by_gemini3.md" },
];

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function resolveCorpusPath(filename: string): Promise<string> {
  // First try public/corpus/ (Vercel deployment)
  const publicPath = resolve(process.cwd(), "public/corpus", filename);
  if (await fileExists(publicPath)) {
    return publicPath;
  }

  // Fall back to repo root (local dev)
  const repoRootPath = resolve(process.cwd(), "../..", filename);
  if (await fileExists(repoRootPath)) {
    return repoRootPath;
  }

  throw new Error(`Corpus file not found: ${filename}`);
}

export async function listCorpusDocs(): Promise<CorpusDoc[]> {
  return CORPUS_DOCS;
}

export async function readCorpusDoc(id: string): Promise<{ doc: CorpusDoc; content: string }> {
  const doc = CORPUS_DOCS.find((d) => d.id === id);
  if (!doc) throw new Error(`Unknown doc: ${id}`);
  const absPath = await resolveCorpusPath(doc.filename);
  const content = await readFile(absPath, "utf8");
  return { doc, content };
}
