import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { headers } from "next/headers";

import { parseQuoteBank, type Quote } from "./quotebank-parser";

/**
 * Operator Library Loader + Parser
 *
 * NOTE: This file uses Node.js APIs and must only be imported from server code.
 * Client components should fetch operator data via a server action/route.
 */

export type OperatorDefinition = {
  symbol: string;
  title: string;
  canonicalTag: string;
  quoteBankAnchors: string[];
  definition: string;
  whenToUseTriggers: string[];
  failureModes: string[];
  transcriptAnchors: string;
};

export type OperatorWithQuotes = OperatorDefinition & {
  quotes: Quote[];
  supportingQuotes: Quote[];
};

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function tryReadFromFilesystem(relativePathFromRepoRoot: string): Promise<string | null> {
  const publicPath = resolve(process.cwd(), "public/_corpus", relativePathFromRepoRoot);
  const repoRootPath = resolve(process.cwd(), "../..", relativePathFromRepoRoot);

  if (await fileExists(publicPath)) {
    return readFile(publicPath, "utf8");
  }

  if (await fileExists(repoRootPath)) {
    return readFile(repoRootPath, "utf8");
  }

  return null;
}

async function fetchFromPublicUrl(relativePathFromCorpusRoot: string): Promise<string> {
  const headersList = await headers();
  const host = headersList.get("host") || "brennerbot.org";
  const protocol = headersList.get("x-forwarded-proto") || "https";
  const baseUrl = `${protocol}://${host}`;

  const url = `${baseUrl}/_corpus/${relativePathFromCorpusRoot}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch operator library from ${url} (${response.status})`);
  }

  return response.text();
}

export async function readOperatorLibraryMarkdown(): Promise<string> {
  const relativePath = "specs/operator_library_v0.1.md";

  const fromFs = await tryReadFromFilesystem(relativePath);
  if (fromFs !== null) return fromFs;

  return fetchFromPublicUrl(relativePath);
}

export async function readQuoteBankMarkdown(): Promise<string> {
  const relativePath = "quote_bank_restored_primitives.md";

  const fromFs = await tryReadFromFilesystem(relativePath);
  if (fromFs !== null) return fromFs;

  return fetchFromPublicUrl(relativePath);
}

function parseBullets(markdown: string): string[] {
  return markdown
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- "))
    .map((line) => line.slice(2).trim())
    .filter(Boolean);
}

export function parseOperatorLibrary(markdown: string): OperatorDefinition[] {
  const coreStart = markdown.indexOf("## Core Operators");
  if (coreStart === -1) {
    throw new Error("Operator library: missing '## Core Operators' section");
  }

  const derivedStart = markdown.indexOf("## Derived Operators", coreStart);
  const coreSection = markdown.slice(coreStart, derivedStart === -1 ? markdown.length : derivedStart);

  const operatorHeaderRegex = /^###\s+(.+)$/gm;
  const headerMatches = [...coreSection.matchAll(operatorHeaderRegex)];

  const operators: OperatorDefinition[] = [];

  for (let i = 0; i < headerMatches.length; i++) {
    const match = headerMatches[i];
    const headerLine = match[1]?.trim();
    if (!headerLine) continue;

    const startIndex = match.index! + match[0].length;
    const endIndex = headerMatches[i + 1]?.index ?? coreSection.length;
    const block = coreSection.slice(startIndex, endIndex);

    const [symbol, ...titleParts] = headerLine.split(/\s+/);
    const title = titleParts.join(" ").trim();

    const definitionMatch = block.match(
      /\*\*Definition\*\*:\s*([\s\S]*?)\n\n\*\*When-to-Use Triggers\*\*:/m
    );
    const triggersMatch = block.match(
      /\*\*When-to-Use Triggers\*\*:\s*\n([\s\S]*?)\n\n\*\*Failure Modes\*\*:/m
    );
    const failureModesMatch = block.match(
      /\*\*Failure Modes\*\*:\s*\n([\s\S]*?)\n\n\*\*Canonical tag\*\*:/m
    );
    const canonicalTagMatch = block.match(/\*\*Canonical tag\*\*:\s*`([^`]+)`/m);
    const quoteBankAnchorsMatch = block.match(/\*\*Quote-bank anchors\*\*:\s*([^\n]+)/m);
    const transcriptAnchorsMatch = block.match(/\*\*Transcript Anchors\*\*:\s*([^\n]+)/m);

    if (!symbol || !title) {
      throw new Error(`Operator library: failed to parse header line: ${headerLine}`);
    }
    if (!definitionMatch) {
      throw new Error(`Operator library: missing Definition block for ${headerLine}`);
    }
    if (!triggersMatch) {
      throw new Error(`Operator library: missing When-to-Use Triggers block for ${headerLine}`);
    }
    if (!failureModesMatch) {
      throw new Error(`Operator library: missing Failure Modes block for ${headerLine}`);
    }
    if (!canonicalTagMatch) {
      throw new Error(`Operator library: missing Canonical tag for ${headerLine}`);
    }
    if (!quoteBankAnchorsMatch) {
      throw new Error(`Operator library: missing Quote-bank anchors for ${headerLine}`);
    }
    if (!transcriptAnchorsMatch) {
      throw new Error(`Operator library: missing Transcript Anchors for ${headerLine}`);
    }

    const canonicalTag = canonicalTagMatch[1].trim();
    const quoteBankAnchors = quoteBankAnchorsMatch[1]
      .split(",")
      .map((a) => a.trim())
      .filter(Boolean);

    operators.push({
      symbol,
      title,
      canonicalTag,
      quoteBankAnchors,
      definition: definitionMatch[1].trim().replace(/\s+/g, " "),
      whenToUseTriggers: parseBullets(triggersMatch[1]),
      failureModes: parseBullets(failureModesMatch[1]),
      transcriptAnchors: transcriptAnchorsMatch[1].trim(),
    });
  }

  return operators;
}

let operatorPaletteCache: OperatorWithQuotes[] | null = null;

export async function getOperatorPalette(): Promise<OperatorWithQuotes[]> {
  if (operatorPaletteCache) return operatorPaletteCache;

  const [operatorMd, quoteBankMd] = await Promise.all([
    readOperatorLibraryMarkdown(),
    readQuoteBankMarkdown(),
  ]);

  const operators = parseOperatorLibrary(operatorMd);
  const quoteBank = parseQuoteBank(quoteBankMd);

  const palette = operators.map((operator) => {
    const quotes = quoteBank.quotes.filter((q) => q.tags.includes(operator.canonicalTag));
    const supportingQuotes = quotes.filter((q) => operator.quoteBankAnchors.includes(q.sectionId));

    return {
      ...operator,
      quotes,
      supportingQuotes,
    };
  });

  operatorPaletteCache = palette;
  return palette;
}

