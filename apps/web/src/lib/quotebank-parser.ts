/**
 * Quote Bank Parser
 * Extracts structured quote data from the quote bank markdown
 */

export interface Quote {
  reference: string; // e.g., "§57"
  title: string;
  text: string;
  whyItMatters: string;
  tags: string[];
}

export interface ParsedQuoteBank {
  title: string;
  description: string;
  quotes: Quote[];
  allTags: string[];
}

/**
 * Parse a single quote section
 */
function parseQuoteSection(content: string): Omit<Quote, "reference" | "title"> | null {
  // Extract quote text (blockquote) - find all lines starting with >
  const lines = content.split("\n");
  const quoteLines: string[] = [];
  let foundQuote = false;

  for (const line of lines) {
    if (line.trim().startsWith(">")) {
      foundQuote = true;
      quoteLines.push(line.replace(/^>\s*/, "").trim());
    } else if (foundQuote && !line.trim()) {
      break; // End of quote block
    } else if (foundQuote) {
      break; // Non-quote content
    }
  }

  if (quoteLines.length === 0) return null;

  const text = quoteLines
    .filter(Boolean)
    .join(" ")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1");

  // Extract "Why it matters"
  const whyMatch = content.match(/Why it matters:\s*([^\n]+(?:\n(?!Tags:)[^\n]+)*)/);
  const whyItMatters = whyMatch?.[1]?.trim().replace(/\n/g, " ") ?? "";

  // Extract tags
  const tagsMatch = content.match(/Tags:\s*`([^`]+)`(?:,\s*`([^`]+)`)*(?:,\s*`([^`]+)`)?/);
  const tags: string[] = [];
  if (tagsMatch) {
    // Extract all backtick-enclosed tags
    const tagMatches = content.match(/`([^`]+)`/g);
    if (tagMatches) {
      tagMatches.forEach((t) => {
        const tag = t.replace(/`/g, "").trim();
        if (tag && !tags.includes(tag)) {
          tags.push(tag);
        }
      });
    }
  }

  return { text, whyItMatters, tags };
}

/**
 * Parse the complete quote bank
 */
export function parseQuoteBank(markdown: string): ParsedQuoteBank {
  // Extract title
  const titleMatch = markdown.match(/^#\s+(.+)$/m);
  const title = titleMatch?.[1] ?? "Quote Bank";

  // Extract description (first paragraph after title)
  const descMatch = markdown.match(/^#\s+.+\n+([^#\n][^\n]+)/m);
  const description = descMatch?.[1]?.trim() ?? "";

  // Find all quote sections (## §N — Title)
  const sectionRegex = /^##\s+(§\d+(?:-\d+)?)\s*[—–-]\s*(.+)$/gm;
  const sectionMatches = [...markdown.matchAll(sectionRegex)];

  const quotes: Quote[] = [];
  const allTags = new Set<string>();

  for (let i = 0; i < sectionMatches.length; i++) {
    const match = sectionMatches[i];
    const reference = match[1]; // §57
    const sectionTitle = match[2].trim();

    // Get content between this header and the next
    const startIndex = match.index! + match[0].length;
    const endIndex = sectionMatches[i + 1]?.index ?? markdown.length;
    const sectionContent = markdown.slice(startIndex, endIndex);

    const parsed = parseQuoteSection(sectionContent);
    if (parsed && parsed.text) {
      quotes.push({
        reference,
        title: sectionTitle,
        text: parsed.text,
        whyItMatters: parsed.whyItMatters,
        tags: parsed.tags,
      });

      parsed.tags.forEach((tag) => allTags.add(tag));
    }
  }

  return {
    title,
    description,
    quotes,
    allTags: Array.from(allTags).sort(),
  };
}

/**
 * Filter quotes by tag
 */
export function filterQuotesByTag(quotes: Quote[], tag: string): Quote[] {
  if (!tag) return quotes;
  return quotes.filter((q) => q.tags.includes(tag));
}

/**
 * Search quotes
 */
export function searchQuotes(quotes: Quote[], query: string): Quote[] {
  const lower = query.toLowerCase();
  return quotes.filter(
    (q) =>
      q.title.toLowerCase().includes(lower) ||
      q.text.toLowerCase().includes(lower) ||
      q.whyItMatters.toLowerCase().includes(lower) ||
      q.tags.some((t) => t.toLowerCase().includes(lower))
  );
}
