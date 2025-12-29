import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

export type ComposePromptInput = {
  templatePathFromRepoRoot: string;
  excerpt: string;
  theme?: string;
  domain?: string;
  question?: string;
};

function repoRootFromWebCwd(): string {
  return resolve(process.cwd(), "../..");
}

export async function composePrompt(input: ComposePromptInput): Promise<string> {
  const repoRoot = repoRootFromWebCwd();
  const templatePath = resolve(repoRoot, input.templatePathFromRepoRoot);
  const template = await readFile(templatePath, "utf8");

  const chunks: string[] = [];
  chunks.push(template.trimEnd());
  chunks.push("");
  chunks.push("---");
  chunks.push("");
  chunks.push("## TRANSCRIPT EXCERPT(S)");
  chunks.push((input.excerpt ?? "").trim());
  chunks.push("");
  if (input.theme) {
    chunks.push("## FOCUS THEME");
    chunks.push(input.theme.trim());
    chunks.push("");
  }
  if (input.domain) {
    chunks.push("## TARGET RESEARCH DOMAIN");
    chunks.push(input.domain.trim());
    chunks.push("");
  }
  if (input.question) {
    chunks.push("## CURRENT RESEARCH QUESTION");
    chunks.push(input.question.trim());
    chunks.push("");
  }
  return chunks.join("\n");
}

