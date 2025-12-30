import { copyFile, mkdir, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { CORPUS_DOCS } from "../src/lib/corpus";

async function assertFileExists(path: string): Promise<void> {
  try {
    await stat(path);
  } catch (error) {
    throw new Error(`Missing corpus file at ${path}`, { cause: error });
  }
}

async function main(): Promise<void> {
  const repoRoot = resolve(process.cwd(), "../..");
  const outputDir = resolve(process.cwd(), "public/corpus");

  await mkdir(outputDir, { recursive: true });

  for (const doc of CORPUS_DOCS) {
    const sourcePath = resolve(repoRoot, doc.filename);
    const outputPath = resolve(outputDir, doc.filename);
    await assertFileExists(sourcePath);
    await copyFile(sourcePath, outputPath);
  }
}

await main();
