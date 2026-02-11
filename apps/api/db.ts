import { Database } from "@db/sqlite";

const DEFAULT_DB_PATH = "db.sqlite";
const dbPath = Deno.env.get("DB_PATH") || DEFAULT_DB_PATH;

export const db = new Database(dbPath);

export interface PayloadInput {
  method: string;
  url: string;
  headers: Record<string, string>;
  body: string;
}

export interface RequestRow {
  id: number;
  method: string;
  url: string;
  headers: string;
  body: string;
  created_at: string;
}

export interface RequestOutput {
  id: number;
  createdAt: string;
  payload: PayloadInput;
}

function parseHeaders(headersJson: string): Record<string, string> {
  try {
    return JSON.parse(headersJson);
  } catch (error) {
    console.error("Failed to parse headers:", error);
    return {};
  }
}

function rowToOutput(row: RequestRow): RequestOutput {
  return {
    id: row.id,
    createdAt: row.created_at,
    payload: {
      method: row.method,
      url: row.url,
      headers: parseHeaders(row.headers),
      body: row.body,
    },
  };
}

export function createRequest(payload: PayloadInput): RequestOutput {
  const row = db
    .prepare(
      `INSERT INTO requests (method, url, headers, body) VALUES (?, ?, ?, ?) RETURNING *`,
    )
    .get<RequestRow>(
      payload.method,
      payload.url,
      JSON.stringify(payload.headers),
      payload.body,
    );

  if (!row) {
    throw new Error("Failed to create request");
  }

  return rowToOutput(row);
}

function toOutputOrNull(row: RequestRow | undefined): RequestOutput | null {
  return row ? rowToOutput(row) : null;
}

export function deleteRequest(id: number): RequestOutput | null {
  const row = db
    .prepare(`DELETE FROM requests WHERE id = ? RETURNING *`)
    .get<RequestRow>(id);
  return toOutputOrNull(row);
}

export function getRequest(id: number): RequestOutput | null {
  const row = db
    .prepare(`SELECT * FROM requests WHERE id = ? LIMIT 1`)
    .get<RequestRow>(id);
  return toOutputOrNull(row);
}

export function listRequests(limit: number, offset: number): RequestOutput[] {
  return db
    .prepare(`SELECT * FROM requests ORDER BY created_at DESC LIMIT ? OFFSET ?`)
    .all<RequestRow>(limit, offset)
    .map(rowToOutput);
}

export function deleteAllRequests(): number {
  return db.prepare(`DELETE FROM requests RETURNING *`).all<RequestRow>()
    .length;
}
