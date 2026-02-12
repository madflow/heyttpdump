import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { createClient } from "@repo/orpc";

const API_URL = Deno.env.get("API_URL") || "http://localhost:3001/rpc";
const client = createClient(API_URL);

export const DELETE: RequestHandler = async ({ params }) => {
  const id = parseInt(params.id);

  if (isNaN(id)) {
    return json({ error: "Invalid request ID" }, { status: 400 });
  }

  try {
    await client.requests.delete({ id });
    return json({ success: true });
  } catch (error) {
    console.error("Failed to delete request:", error);
    
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const isConnectionError = errorMessage.includes("fetch failed") || 
                              errorMessage.includes("ECONNREFUSED") ||
                              errorMessage.includes("Connection refused");
    
    return json(
      { 
        error: "Failed to connect to backend API",
        details: errorMessage
      },
      { status: isConnectionError ? 503 : 500 }
    );
  }
};
