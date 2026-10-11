import { DatabaseSync } from "node:sqlite";

const db = new DatabaseSync(process.env.DB_PATH || "db.sqlite");
try {
  db.exec(`CREATE TABLE IF NOT EXISTS requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    method TEXT NOT NULL,
    url TEXT NOT NULL,
    headers TEXT NOT NULL,
    body TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  console.log("Database migration completed.");
} finally {
  db.close();
}
