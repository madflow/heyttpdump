import assert from "node:assert/strict";
import { test } from "node:test";
import { DatabaseSync } from "node:sqlite";
import { createSqliteRepository } from "../../apps/api/dist/db.js";
import { migrate, temporaryDatabase } from "./helpers.ts";
import { payload, repositoryContract } from "./repository-contract.ts";

repositoryContract("Node SQLite", async () => {
  const database = await temporaryDatabase();
  migrate(database.path);
  const { repository, close } = createSqliteRepository(database.path);
  return {
    repository,
    cleanup: async () => {
      close();
      await database.cleanup();
    },
  };
});

test("migration is idempotent and existing-schema data survives reopening", async (t) => {
  const database = await temporaryDatabase();
  t.after(database.cleanup);
  const original = new DatabaseSync(database.path);
  // This is the original schema, deliberately independent of the new migration.
  original.exec(`CREATE TABLE requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    method TEXT NOT NULL, url TEXT NOT NULL, headers TEXT NOT NULL, body TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  original
    .prepare("INSERT INTO requests VALUES (?, ?, ?, ?, ?, ?)")
    .run(
      42,
      "POST",
      payload.url,
      JSON.stringify(payload.headers),
      payload.body,
      "2025-01-02 03:04:05",
    );
  original.close();
  migrate(database.path);
  migrate(database.path);
  const first = createSqliteRepository(database.path);
  try {
    assert.deepEqual(await first.repository.getRequest(42), {
      id: 42,
      createdAt: "2025-01-02 03:04:05",
      payload,
    });
    assert.equal((await first.repository.createRequest(payload)).id, 43);
  } finally {
    first.close();
  }
  const reopened = createSqliteRepository(database.path);
  try {
    assert.equal((await reopened.repository.listRequests(10, 0)).length, 2);
  } finally {
    reopened.close();
  }
});

test("malformed headers fall back, ordering is unchanged, failures reject", async (t) => {
  const database = await temporaryDatabase();
  t.after(database.cleanup);
  migrate(database.path);
  const raw = new DatabaseSync(database.path);
  raw
    .prepare("INSERT INTO requests VALUES (?, ?, ?, ?, ?, ?)")
    .run(1, "GET", payload.url, "{invalid", "", "2024-01-01 00:00:00");
  raw
    .prepare("INSERT INTO requests VALUES (?, ?, ?, ?, ?, ?)")
    .run(2, "GET", payload.url, "{}", "", "2025-01-01 00:00:00");
  raw.close();
  const { repository, close } = createSqliteRepository(database.path);
  try {
    assert.deepEqual((await repository.getRequest(1))?.payload.headers, {});
    assert.deepEqual(
      (await repository.listRequests(10, 0)).map((row) => row.id),
      [2, 1],
    );
  } finally {
    close();
  }
  await assert.rejects(repository.checkReady());
  await assert.rejects(repository.createRequest(payload));
  await assert.rejects(repository.getRequest(1));
  await assert.rejects(repository.listRequests(10, 0));
  await assert.rejects(repository.deleteRequest(1));
  await assert.rejects(repository.deleteAllRequests());
});
