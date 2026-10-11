import type { RequestOutput } from "./request-repository.ts";

export function parseHeaders(value: string): Record<string, string> {
  try {
    const parsed: unknown = JSON.parse(value);
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("Headers must be an object");
    }
    const headers: Record<string, string> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value !== "string") throw new Error("Header values must be strings");
      Object.defineProperty(headers, key, {
        value,
        enumerable: true,
        configurable: true,
        writable: true,
      });
    }
    return headers;
  } catch (error) {
    console.error("Failed to parse headers:", error);
    return {};
  }
}

export function rowToOutput(row: Record<string, unknown>): RequestOutput {
  const stringColumn = (key: string): string => {
    const value = row[key];
    if (typeof value !== "string") throw new Error(`Invalid database column: ${key}`);
    return value;
  };
  if (typeof row.id !== "number") throw new Error("Invalid database ID");
  return {
    id: row.id,
    createdAt: stringColumn("created_at"),
    payload: {
      method: stringColumn("method"),
      url: stringColumn("url"),
      headers: parseHeaders(stringColumn("headers")),
      body: stringColumn("body"),
    },
  };
}
