import { Hono } from "hono";
import { createClient } from "@repo/orpc";

const DEFAULT_API_URL = "http://localhost:3001/rpc";
const DEFAULT_PORT = 3000;

const API_URL = Deno.env.get("API_URL") || DEFAULT_API_URL;
const PORT = Number(Deno.env.get("DUMP_PORT")) || DEFAULT_PORT;

const app = new Hono();
const apiClient = createClient(API_URL);

app.all("*", async (c) => {
  try {
    const requestPayload = {
      method: c.req.method,
      url: c.req.url,
      headers: Object.fromEntries(c.req.raw.headers.entries()),
      body: await c.req.text(),
    };

    const createdRequest = await apiClient.requests.create({
      payload: requestPayload,
    });

    return c.json({ request: createdRequest });
  } catch (error) {
    console.error("Failed to create request:", error);
    return c.json(
      { error: "Failed to record request" },
      { status: 500 }
    );
  }
});

console.log(`HTTP dump service listening on port ${PORT}`);
Deno.serve({ port: PORT }, app.fetch);
