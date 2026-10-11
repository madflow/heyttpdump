import assert from "node:assert/strict";
import { test } from "node:test";
import type { RequestRepository } from "../../apps/api/dist/request-repository.js";

export const payload = {
  method: "POST",
  url: "https://example.test/capture?x=1",
  headers: { "content-type": "application/json" },
  body: '{"hello":"world"}',
};

/** Reuse this suite with a future D1 adapter and its isolated test database. */
export function repositoryContract(
  name: string,
  setup: () => Promise<{
    repository: RequestRepository;
    cleanup: () => Promise<void>;
  }>,
) {
  test(`${name}: async request repository contract`, async (t) => {
    const { repository, cleanup } = await setup();
    t.after(cleanup);
    await repository.checkReady();
    assert.equal(await repository.getRequest(999), null);
    assert.equal(await repository.deleteRequest(999), null);
    assert.equal(await repository.deleteAllRequests(), 0);
    const pending = repository.createRequest(payload);
    assert.ok(pending instanceof Promise);
    const first = await pending;
    assert.equal(typeof first.id, "number");
    assert.match(first.createdAt, /^\d{4}-\d{2}-\d{2} /);
    assert.deepEqual(first.payload, payload);
    assert.deepEqual(await repository.getRequest(first.id), first);
    const second = await repository.createRequest({ ...payload, body: "" });
    assert.notEqual(first.id, second.id);
    const all = await repository.listRequests(10, 0);
    assert.equal(all.length, 2);
    assert.deepEqual(await repository.listRequests(1, 1), all.slice(1, 2));
    assert.deepEqual(await repository.listRequests(10, 20), []);
    assert.deepEqual(await repository.deleteRequest(first.id), first);
    assert.equal(await repository.getRequest(first.id), null);
    assert.equal(await repository.deleteAllRequests(), 1);
    assert.deepEqual(await repository.listRequests(10, 0), []);
  });
}
