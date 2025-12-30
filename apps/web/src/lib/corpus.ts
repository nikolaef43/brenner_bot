import { readFile, access, readdir } from "node:fs/promises";
import { resolve, join } from "node:path";

export type DocCategory = "transcript" | "quote-bank" | "distillation" | "metaprompt" | "raw-response";

export type CorpusDoc = {
  id: string;
  title: string;
  filename: string;
  description?: string;
  category: DocCategory;
  model?: "gpt" | "opus" | "gemini";
};

export const CORPUS_DOCS: CorpusDoc[] = [
  // Primary Sources
  {
    id: "transcript",
    title: "Complete Transcript Collection",
    filename: "complete_brenner_transcript.md",
    description: "The full Web of Stories interview transcript with Sydney Brenner - 236 segments of wisdom.",
    category: "transcript",
  },
  {
    id: "quote-bank",
    title: "Quote Bank",
    filename: "quote_bank_restored_primitives.md",
    description: "Curated verbatim quotes organized by theme for quick reference.",
    category: "quote-bank",
  },
  // Metaprompts
  {
    id: "metaprompt",
    title: "Metaprompt (v0.2)",
    filename: "metaprompt_by_gpt_52.md",
    description: "A structured prompt for applying the Brenner method to new domains.",
    category: "metaprompt",
  },
  {
    id: "initial-metaprompt",
    title: "Initial Metaprompt",
    filename: "initial_metaprompt.md",
    description: "The original metaprompt that started the distillation process.",
    category: "metaprompt",
  },
  // Final Distillations
  {
    id: "distillation-gpt-52",
    title: "Final Distillation (GPT-5.2)",
    filename: "final_distillation_of_brenner_method_by_gpt_52_extra_high_reasoning.md",
    description: "GPT-5.2's analysis emphasizing optimization and systematic search.",
    category: "distillation",
    model: "gpt",
  },
  {
    id: "distillation-opus-45",
    title: "Final Distillation (Opus 4.5)",
    filename: "final_distillation_of_brenner_method_by_opus45.md",
    description: "Claude Opus 4.5's analysis framing the method through epistemic axioms.",
    category: "distillation",
    model: "opus",
  },
  {
    id: "distillation-gemini-3",
    title: "Final Distillation (Gemini 3)",
    filename: "final_distillation_of_brenner_method_by_gemini3.md",
    description: "Gemini 3's minimal kernel distillation of core cognitive operations.",
    category: "distillation",
    model: "gemini",
  },
  // Raw Model Responses - GPT
  {
    id: "raw-gpt-batch-1",
    title: "GPT-5.2 Response (Batch 1)",
    filename: "gpt_pro_extended_reasoning_responses/brenner_bot__gpt_pro_52__response_batch_1.md",
    description: "First batch of GPT-5.2 extended reasoning responses.",
    category: "raw-response",
    model: "gpt",
  },
  {
    id: "raw-gpt-batch-2",
    title: "GPT-5.2 Response (Batch 2)",
    filename: "gpt_pro_extended_reasoning_responses/brenner_bot__gpt_pro_52__response_batch_2.md",
    description: "Second batch of GPT-5.2 extended reasoning responses.",
    category: "raw-response",
    model: "gpt",
  },
  {
    id: "raw-gpt-batch-3",
    title: "GPT-5.2 Response (Batch 3)",
    filename: "gpt_pro_extended_reasoning_responses/brenner_bot__gpt_pro_52__response_batch_3.md",
    description: "Third batch of GPT-5.2 extended reasoning responses.",
    category: "raw-response",
    model: "gpt",
  },
  {
    id: "raw-gpt-truncated",
    title: "GPT-5.2 Response (Previously Truncated)",
    filename: "gpt_pro_extended_reasoning_responses/brenner_bot__gpt_pro_52__response_previously_truncated_batch.md",
    description: "Previously truncated GPT-5.2 responses, now complete.",
    category: "raw-response",
    model: "gpt",
  },
  // Raw Model Responses - Opus
  {
    id: "raw-opus-batch-1",
    title: "Opus 4.5 Response (Batch 1)",
    filename: "opus_45_responses/brenner_bot__opus_45__response_batch_1.md",
    description: "First batch of Claude Opus 4.5 responses.",
    category: "raw-response",
    model: "opus",
  },
  {
    id: "raw-opus-batch-2",
    title: "Opus 4.5 Response (Batch 2)",
    filename: "opus_45_responses/brenner_bot__opus_45__response_batch_2.md",
    description: "Second batch of Claude Opus 4.5 responses.",
    category: "raw-response",
    model: "opus",
  },
  {
    id: "raw-opus-batch-3",
    title: "Opus 4.5 Response (Batch 3)",
    filename: "opus_45_responses/brenner_bot__opus_45__response_batch_3.md",
    description: "Third batch of Claude Opus 4.5 responses.",
    category: "raw-response",
    model: "opus",
  },
  // Raw Model Responses - Gemini
  {
    id: "raw-gemini-batch-1",
    title: "Gemini 3 Response (Batch 1)",
    filename: "gemini_3_deep_think_responses/brenner_bot__gemini3__response_batch_1.md",
    description: "First batch of Gemini 3 deep think responses.",
    category: "raw-response",
    model: "gemini",
  },
  {
    id: "raw-gemini-batch-2",
    title: "Gemini 3 Response (Batch 2)",
    filename: "gemini_3_deep_think_responses/brenner_bot__gemini3__response_batch_2.md",
    description: "Second batch of Gemini 3 deep think responses.",
    category: "raw-response",
    model: "gemini",
  },
  {
    id: "raw-gemini-batch-3",
    title: "Gemini 3 Response (Batch 3)",
    filename: "gemini_3_deep_think_responses/brenner_bot__gemini3__response_batch_3.md",
    description: "Third batch of Gemini 3 deep think responses.",
    category: "raw-response",
    model: "gemini",
  },
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
  const publicPath = resolve(process.cwd(), "public/corpus", filename);
  const repoRootPath = resolve(process.cwd(), "../..", filename);

  // Prefer public/corpus/ for deployment, fallback to repo root for local dev.
  if (await fileExists(publicPath)) return publicPath;
  if (await fileExists(repoRootPath)) return repoRootPath;

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
