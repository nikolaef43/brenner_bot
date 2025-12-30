import { copyFile, mkdir, stat, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { CORPUS_DOCS } from "../src/lib/corpus";

async function assertFileExists(path: string): Promise<void> {
  try {
    await stat(path);
  } catch (error) {
    throw new Error(`Missing corpus file at ${path}`, { cause: error });
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

    await assertFileExists(sourcePath);
    await copyFile(sourcePath, outputPath);
  }
}

await main();
