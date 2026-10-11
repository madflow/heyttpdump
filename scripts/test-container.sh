#!/bin/sh
# Isolated volume and no published ports: safe to run alongside a development instance.
set -eu
image=${1:-heyttpdump:test}
name="heyttpdump-test-$$"
volume="$name-data"
cleanup() {
  docker logs "$name" 2>/dev/null || true
  docker rm -f "$name" >/dev/null 2>&1 || true
  docker volume rm "$volume" >/dev/null 2>&1 || true
}
trap cleanup EXIT
trap 'exit 1' INT TERM

docker volume create "$volume" >/dev/null
start() {
  docker run -d --name "$name" -v "$volume:/app/data" "$image" >/dev/null
  attempt=0
  until docker exec "$name" node scripts/healthcheck.mjs; do
    attempt=$((attempt + 1))
    [ "$attempt" -lt 30 ] || exit 1
    sleep 1
  done
  docker exec "$name" node --input-type=module -e '
    import assert from "node:assert/strict";
    for (let i = 0; ; i++) {
      try {
        assert.ok((await fetch("http://localhost:3002")).ok);
        break;
      } catch (error) {
        if (i >= 30) throw error;
        await new Promise(r => setTimeout(r, 1000));
      }
    }
  '
}
start
docker exec "$name" node --input-type=module -e '
  import assert from "node:assert/strict";
  const response = await fetch("http://localhost:3000/persist?test=1", {method: "POST", body: "container-test"});
  assert.ok(response.ok);
  assert.equal((await response.json()).request.payload.body, "container-test");
'
docker stop --time 20 "$name" >/dev/null
[ "$(docker inspect --format '{{.State.ExitCode}}' "$name")" = 0 ]
docker rm "$name" >/dev/null
start
docker exec "$name" node --input-type=module -e '
  import assert from "node:assert/strict";
  const response = await fetch("http://localhost:3002/api/requests");
  assert.ok(response.ok);
  assert.ok((await response.json()).some(row => row.payload.body === "container-test"));
'
