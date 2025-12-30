#!/usr/bin/env bun
/**
 * Prebuild script: copies corpus markdown files from repo root to public/corpus/
 * so they're available as static assets on Vercel.
 */

import { copyFile, mkdir } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const CORPUS_FILES = [
  "complete_brenner_transcript.md",
  "metaprompt_by_gpt_52.md",
  "initial_metaprompt.md",
  "final_distillation_of_brenner_method_by_gpt_52_extra_high_reasoning.md",
  "final_distillation_of_brenner_method_by_opus45.md",
  "final_distillation_of_brenner_method_by_gemini3.md",
];

async function main() {
  const webRoot = dirname(dirname(fileURLToPath(import.meta.url)));
  const repoRoot = resolve(webRoot, "../..");
  const destDir = resolve(webRoot, "public/corpus");

  await mkdir(destDir, { recursive: true });

  for (const file of CORPUS_FILES) {
    const src = resolve(repoRoot, file);
    const dest = resolve(destDir, file);
    try {
      await copyFile(src, dest);
      console.log(`✓ Copied ${file}`);
    } catch (err) {
      console.error(`✗ Failed to copy ${file}:`, err);
    }
  }

  console.log(`\nCorpus files copied to ${destDir}`);
}

main().catch(console.error);
