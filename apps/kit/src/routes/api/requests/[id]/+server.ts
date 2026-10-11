import type { RequestHandler } from "./$types";
import { getApiClient } from "#lib/server/api.ts";

export const DELETE: RequestHandler = async ({ params }) => {
  const id = parseInt(params.id);

  if (isNaN(id)) {
    return Response.json({ error: "Invalid request ID" }, { status: 400 });
  }

  try {
    const { client } = getApiClient();
    await client.requests.delete({ id });
    return Response.json({ success: true });
  } catch (error) {
    console.error("Failed to delete request:", error);

    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const isConnectionError =
      errorMessage.includes("fetch failed") ||
      errorMessage.includes("ECONNREFUSED") ||
      errorMessage.includes("Connection refused");

    return Response.json(
      {
        error: "Failed to connect to backend API",
        details: errorMessage,
      },
      { status: isConnectionError ? 503 : 500 },
    );
  }
};
