import { copyFile, mkdir, stat, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { CORPUS_DOCS } from "../src/lib/corpus";

async function fileExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

function restrictedCorpusStub(filename: string): string {
  return [
    `# Restricted document`,
    ``,
    `This document is not included in public builds of Brenner Bot.`,
    ``,
    `- File: \`${filename}\``,
    `- Reason: content policy / distribution constraints`,
    ``,
    `See: \`content_policy_research_v0.1.md\``,
    ``,
  ].join("\n");
}

function missingFileStub(filename: string): string {
  return [
    `# Document not available`,
    ``,
    `This document could not be found during build.`,
    ``,
    `- File: \`${filename}\``,
    ``,
    `This may occur in cloud builds where the full repository structure is not available.`,
    ``,
  ].join("\n");
}

async function main(): Promise<void> {
  const repoRoot = resolve(process.cwd(), "../..");
  const outputDir = resolve(process.cwd(), "public/corpus");

  await mkdir(outputDir, { recursive: true });

  for (const doc of CORPUS_DOCS) {
    const sourcePath = resolve(repoRoot, doc.filename);
    const outputPath = resolve(outputDir, doc.filename);

    // Never copy restricted docs into public assets; write a stub instead.
    if (doc.access === "restricted") {
      await writeFile(outputPath, restrictedCorpusStub(doc.filename), "utf8");
      continue;
    }

    // Check if the output file already exists (e.g., committed to git for Vercel)
    if (await fileExists(outputPath)) {
      console.log(`[copy-corpus] Skipping ${doc.filename} - already exists in public/corpus`);
      continue;
    }

    // Try to copy from repo root (local dev scenario)
    if (await fileExists(sourcePath)) {
      await copyFile(sourcePath, outputPath);
      console.log(`[copy-corpus] Copied ${doc.filename}`);
    } else {
      // Write a stub for missing files (Vercel build without repo root access)
      console.warn(`[copy-corpus] Source not found, writing stub for ${doc.filename}`);
      await writeFile(outputPath, missingFileStub(doc.filename), "utf8");
    }
  }
}

await main();
