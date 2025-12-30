/**
 * Metaprompt Parser
 * Parses metaprompt markdown into structured sections
 */

export interface MetapromptSection {
  level: number;
  title: string;
  content: string;
}

export interface ParsedMetaprompt {
  title: string;
  description?: string;
  sections: MetapromptSection[];
  wordCount: number;
}

/**
 * Parse metaprompt markdown
 */
export function parseMetaprompt(markdown: string): ParsedMetaprompt {
  const lines = markdown.split("\n");

  // Extract title (first H1)
  const titleMatch = markdown.match(/^#\s+(.+)$/m);
  const title = titleMatch?.[1] ?? "Metaprompt";

  // Extract description (first paragraph after title)
  const descMatch = markdown.match(/^#\s+.+\n+([^#\n][^\n]+)/m);
  const description = descMatch?.[1]?.trim();

  // Word count
  const wordCount = markdown.split(/\s+/).filter(Boolean).length;

  // Find all sections
  const sectionRegex = /^(#{2,4})\s+(.+)$/gm;
  const sectionMatches = [...markdown.matchAll(sectionRegex)];

  const sections: MetapromptSection[] = [];

  for (let i = 0; i < sectionMatches.length; i++) {
    const match = sectionMatches[i];
    const level = match[1].length - 1; // h2 = 1, h3 = 2, h4 = 3
    const sectionTitle = match[2];

    const startIndex = match.index! + match[0].length;
    const endIndex = sectionMatches[i + 1]?.index ?? markdown.length;
    const content = markdown.slice(startIndex, endIndex).trim();

    sections.push({
      level,
      title: sectionTitle,
      content,
    });
  }

  return {
    title,
    description,
    sections,
    wordCount,
  };
}
