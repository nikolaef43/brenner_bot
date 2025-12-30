import { copyFile, mkdir, stat } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { CORPUS_DOCS } from "../src/lib/corpus";

const EXTRA_CORPUS_FILES = ["specs/operator_library_v0.1.md"] as const;

async function fileExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function main(): Promise<void> {
  const repoRoot = resolve(process.cwd(), "../..");
  const outputDir = resolve(process.cwd(), "public/_corpus");

  await mkdir(outputDir, { recursive: true });

  async function copyOne(relativePath: string): Promise<void> {
    const sourcePath = resolve(repoRoot, relativePath);
    const outputPath = resolve(outputDir, relativePath);

    // Ensure the parent directory exists (for files in subdirectories)
    const parentDir = dirname(outputPath);
    await mkdir(parentDir, { recursive: true });

    // Check if the output file already exists and is not a stub
    if (await fileExists(outputPath)) {
      const stats = await stat(outputPath);
      // If file is larger than 1KB, assume it's already the real file
      if (stats.size > 1024) {
        console.log(`[copy-corpus] Skipping ${relativePath} - already exists (${Math.round(stats.size / 1024)}KB)`);
        return;
      }
    }

    // Try to copy from repo root
    if (await fileExists(sourcePath)) {
      await copyFile(sourcePath, outputPath);
      const stats = await stat(outputPath);
      console.log(`[copy-corpus] Copied ${relativePath} (${Math.round(stats.size / 1024)}KB)`);
    } else {
      console.warn(`[copy-corpus] WARNING: Source not found: ${relativePath}`);
    }
  }

  for (const doc of CORPUS_DOCS) {
    await copyOne(doc.filename);
  }

  for (const relativePath of EXTRA_CORPUS_FILES) {
    await copyOne(relativePath);
  }
}

await main();
