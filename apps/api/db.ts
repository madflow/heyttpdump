import { DatabaseSync, type SQLOutputValue } from "node:sqlite";
import type { RequestOutput, RequestRepository } from "./request-repository.ts";

type Row = Record<string, SQLOutputValue>;

function stringColumn(row: Row, key: string): string {
  const value = row[key];
  if (typeof value !== "string") throw new Error(`Invalid database column: ${key}`);
  return value;
}

function parseHeaders(value: string): Record<string, string> {
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

function rowToOutput(row: Row): RequestOutput {
  if (typeof row.id !== "number") throw new Error("Invalid database ID");
  return {
    id: row.id,
    createdAt: stringColumn(row, "created_at"),
    payload: {
      method: stringColumn(row, "method"),
      url: stringColumn(row, "url"),
      headers: parseHeaders(stringColumn(row, "headers")),
      body: stringColumn(row, "body"),
    },
  };
}

function toOutputOrNull(row: Row | undefined): RequestOutput | null {
  return row ? rowToOutput(row) : null;
}

/** Promises provide adapter compatibility, not nonblocking SQLite execution. */
export function createSqliteRepository(path: string): {
  repository: RequestRepository;
  close: () => void;
} {
  const db = new DatabaseSync(path);
  const repository: RequestRepository = {
    async createRequest(payload) {
      const row = db
        .prepare(
          "INSERT INTO requests (method, url, headers, body) VALUES (?, ?, ?, ?) RETURNING *",
        )
        .get(payload.method, payload.url, JSON.stringify(payload.headers), payload.body);
      if (!row) throw new Error("Failed to create request");
      return rowToOutput(row);
    },
    async getRequest(id) {
      return toOutputOrNull(db.prepare("SELECT * FROM requests WHERE id = ? LIMIT 1").get(id));
    },
    async listRequests(limit, offset) {
      return db
        .prepare("SELECT * FROM requests ORDER BY created_at DESC LIMIT ? OFFSET ?")
        .all(limit, offset)
        .map(rowToOutput);
    },
    async deleteRequest(id) {
      return toOutputOrNull(db.prepare("DELETE FROM requests WHERE id = ? RETURNING *").get(id));
    },
    async deleteAllRequests() {
      return db.prepare("DELETE FROM requests RETURNING *").all().length;
    },
    async checkReady() {
      db.prepare("SELECT 1").get();
    },
  };
  return { repository, close: () => db.close() };
}
