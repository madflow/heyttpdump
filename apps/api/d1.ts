import { ORPCError } from "@orpc/server";
import type { RequestRepository } from "./request-repository.ts";
import { rowToOutput } from "./request-row.ts";

export const MAX_BODY_BYTES = 262_144;

export function createD1Repository(db: D1Database): RequestRepository {
  const output = (row: Record<string, unknown> | null) => (row ? rowToOutput(row) : null);
  return {
    async createRequest(payload) {
      if (new TextEncoder().encode(payload.body).byteLength > MAX_BODY_BYTES) {
        throw new ORPCError("PAYLOAD_TOO_LARGE", { message: "Capture body exceeds 256 KiB" });
      }
      const row = await db
        .prepare(
          "INSERT INTO requests (method, url, headers, body) VALUES (?, ?, ?, ?) RETURNING *",
        )
        .bind(payload.method, payload.url, JSON.stringify(payload.headers), payload.body)
        .first();
      if (!row) throw new Error("Failed to create request");
      return rowToOutput(row);
    },
    async getRequest(id) {
      return output(
        await db.prepare("SELECT * FROM requests WHERE id = ? LIMIT 1").bind(id).first(),
      );
    },
    async listRequests(limit, offset) {
      const result = await db
        .prepare("SELECT * FROM requests ORDER BY created_at DESC LIMIT ? OFFSET ?")
        .bind(limit, offset)
        .all();
      return result.results.map(rowToOutput);
    },
    async deleteRequest(id) {
      return output(
        await db.prepare("DELETE FROM requests WHERE id = ? RETURNING *").bind(id).first(),
      );
    },
    async deleteAllRequests() {
      const result = await db.prepare("DELETE FROM requests").run();
      return result.meta.changes;
    },
    async checkReady() {
      await db.prepare("SELECT 1").first();
    },
  };
}
