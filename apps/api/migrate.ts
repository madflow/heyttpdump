import { db } from "./db.ts";

const requestsTableCreate = `CREATE TABLE IF NOT EXISTS requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  method TEXT NOT NULL,
  url TEXT NOT NULL,
  headers TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`;

db.exec(requestsTableCreate);

console.log("Database migration completed.");
