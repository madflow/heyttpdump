import { DatabaseSync, type SQLOutputValue } from "node:sqlite";
import type { RequestOutput, RequestRepository } from "./request-repository.ts";
import { rowToOutput } from "./request-row.ts";

type Row = Record<string, SQLOutputValue>;

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
