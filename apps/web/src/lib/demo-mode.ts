export function isDemoThreadId(threadId: string): boolean {
  return threadId.startsWith("demo-");
}

export function normalizeThreadId(value: string | string[] | undefined): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value[0] ?? "";
  return "";
}
