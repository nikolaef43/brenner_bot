import { readFile, access } from "node:fs/promises";
import { resolve } from "node:path";

export type CorpusAccess = "public" | "restricted";

export type CorpusDoc = {
  id: string;
  title: string;
  filename: string;
  access: CorpusAccess;
};

export const CORPUS_DOCS: CorpusDoc[] = [
  { id: "transcript", title: "Complete Transcript Collection", filename: "complete_brenner_transcript.md", access: "restricted" },
  { id: "quote-bank", title: "Quote Bank (Verbatim Primitives)", filename: "quote_bank_restored_primitives.md", access: "public" },
  { id: "metaprompt", title: "Metaprompt (v0.2)", filename: "metaprompt_by_gpt_52.md", access: "public" },
  { id: "initial-metaprompt", title: "Initial Metaprompt", filename: "initial_metaprompt.md", access: "public" },
  { id: "distillation-gpt-52", title: "Final Distillation (GPT‑5.2)", filename: "final_distillation_of_brenner_method_by_gpt_52_extra_high_reasoning.md", access: "public" },
  { id: "distillation-opus-45", title: "Final Distillation (Opus 4.5)", filename: "final_distillation_of_brenner_method_by_opus45.md", access: "public" },
  { id: "distillation-gemini-3", title: "Final Distillation (Gemini 3)", filename: "final_distillation_of_brenner_method_by_gemini3.md", access: "public" },
];

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export function isLabModeEnabled(): boolean {
  const labModeValue = (process.env.BRENNER_LAB_MODE ?? "").trim().toLowerCase();
  return labModeValue === "1" || labModeValue === "true";
}

function canReadDoc(doc: CorpusDoc): boolean {
  return doc.access === "public" || isLabModeEnabled();
}

function restrictedDocStub(doc: CorpusDoc): string {
  return [
    `# Restricted document`,
    ``,
    `This document is not available in public mode.`,
    ``,
    `- Doc: \`${doc.filename}\``,
    `- Reason: content policy / distribution constraints`,
    ``,
    `If you are running Brenner Bot in lab mode, set \`BRENNER_LAB_MODE=true\` and reload.`,
    ``,
    `See: \`content_policy_research_v0.1.md\``,
    ``,
  ].join("\n");
}

async function resolveCorpusPath(doc: CorpusDoc): Promise<string> {
  const publicPath = resolve(process.cwd(), "public/corpus", doc.filename);
  const repoRootPath = resolve(process.cwd(), "../..", doc.filename);

  // Prefer repo root for restricted docs (avoid relying on copied public assets in local dev).
  if (doc.access === "restricted") {
    if (await fileExists(repoRootPath)) return repoRootPath;
    if (await fileExists(publicPath)) return publicPath;
  } else {
    // Prefer public/corpus/ for deployment, fallback to repo root for local dev.
    if (await fileExists(publicPath)) return publicPath;
    if (await fileExists(repoRootPath)) return repoRootPath;
  }

  throw new Error(`Corpus file not found: ${doc.filename}`);
}

export async function listCorpusDocs(): Promise<CorpusDoc[]> {
  return CORPUS_DOCS;
}

export async function readCorpusDoc(id: string): Promise<{ doc: CorpusDoc; content: string; restricted: boolean }> {
  const doc = CORPUS_DOCS.find((d) => d.id === id);
  if (!doc) throw new Error(`Unknown doc: ${id}`);

  if (!canReadDoc(doc)) {
    return { doc, content: restrictedDocStub(doc), restricted: true };
  }

  const absPath = await resolveCorpusPath(doc);
  const content = await readFile(absPath, "utf8");
  return { doc, content, restricted: false };
}
