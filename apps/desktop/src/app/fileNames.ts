export function formatProjectDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function safeFileName(name: string): string {
  return (
    name
      .trim()
      .replace(/[\\/:*?"<>|]+/g, "-")
      .replace(/\s+/g, " ")
      .replace(/^-+|-+$/g, "") || "cortador"
  );
}
