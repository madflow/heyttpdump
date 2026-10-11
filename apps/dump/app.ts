import { Hono } from "hono";
import type { createClient } from "@repo/orpc";

async function readLimitedBody(request: Request, maxBytes: number): Promise<string | null> {
  const length = request.headers.get("content-length");
  if (length !== null && Number(length) > maxBytes) return null;
  if (!request.body) return "";
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let bytes = 0;
  let text = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) return text + decoder.decode();
      bytes += value.byteLength;
      if (bytes > maxBytes) {
        await reader.cancel();
        return null;
      }
      text += decoder.decode(value, { stream: true });
    }
  } finally {
    reader.releaseLock();
  }
}

export function createDumpApp(client: ReturnType<typeof createClient>, maxBodyBytes?: number) {
  const app = new Hono();
  app.all("*", async (c) => {
    try {
      const body =
        maxBodyBytes === undefined
          ? await c.req.text()
          : await readLimitedBody(c.req.raw, maxBodyBytes);
      if (body === null) return c.json({ error: "Capture body too large" }, 413);
      const createdRequest = await client.requests.create({
        payload: {
          method: c.req.method,
          url: c.req.url,
          headers: Object.fromEntries(c.req.raw.headers.entries()),
          body,
        },
      });
      return c.json({ request: createdRequest });
    } catch (error) {
      console.error("Failed to create request:", error);
      return c.json({ error: "Failed to record request" }, { status: 500 });
    }
  });
  return app;
}
