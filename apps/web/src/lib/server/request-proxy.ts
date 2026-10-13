import "@tanstack/react-start/server-only";
import { getApiClient } from "#lib/server/api.ts";

export function protectDeletion(request: globalThis.Request): Response | undefined {
  const contentType = request.headers.get("content-type")?.split(";")[0].trim().toLowerCase();
  const origin = request.headers.get("origin");
  if (
    contentType !== "application/json" ||
    (origin !== null && origin !== new URL(request.url).origin)
  ) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
}

function failure(error: unknown, apiUrl?: string) {
  const errorMessage = error instanceof Error ? error.message : "Unknown error";
  const connectionError =
    errorMessage.includes("fetch failed") ||
    errorMessage.includes("ECONNREFUSED") ||
    errorMessage.includes("Connection refused");
  return Response.json(
    {
      error: "Failed to connect to backend API",
      details: errorMessage,
      ...(apiUrl === undefined ? {} : { apiUrl }),
    },
    { status: connectionError ? 503 : 500 },
  );
}

export async function listRequests(request: globalThis.Request) {
  const url = new URL(request.url);
  const limit = parseInt(url.searchParams.get("limit") || "10");
  const offset = parseInt(url.searchParams.get("offset") || "0");
  let apiUrl: string | undefined;
  try {
    const { client, url } = getApiClient();
    apiUrl = url;
    return Response.json(await client.requests.list({ limit, offset }));
  } catch (error) {
    console.error("Failed to fetch requests from API:", error);
    return failure(error, apiUrl);
  }
}

export async function removeAllRequests(request: globalThis.Request) {
  const forbidden = protectDeletion(request);
  if (forbidden) return forbidden;
  try {
    const { client } = getApiClient();
    return Response.json({ deletedCount: await client.requests.deleteAll() });
  } catch (error) {
    console.error("Failed to delete all requests:", error);
    return failure(error);
  }
}

export async function removeRequest(request: globalThis.Request, rawId: string) {
  const forbidden = protectDeletion(request);
  if (forbidden) return forbidden;
  const id = parseInt(rawId);
  if (isNaN(id)) return Response.json({ error: "Invalid request ID" }, { status: 400 });
  try {
    const { client } = getApiClient();
    await client.requests.delete({ id });
    return Response.json({ success: true });
  } catch (error) {
    console.error("Failed to delete request:", error);
    return failure(error);
  }
}
