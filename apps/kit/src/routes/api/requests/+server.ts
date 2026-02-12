import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { createClient } from "@repo/orpc";

const API_URL = Deno.env.get("API_URL") || "http://localhost:3001/rpc";
const client = createClient(API_URL);

export const GET: RequestHandler = async ({ url }) => {
  const limit = parseInt(url.searchParams.get("limit") || "10");
  const offset = parseInt(url.searchParams.get("offset") || "0");

  try {
    const requests = await client.requests.list({ limit, offset });
    return json(requests);
  } catch (error) {
    console.error("Failed to fetch requests from API:", error);
    
    // Return 503 for connection errors (service unavailable)
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const isConnectionError = errorMessage.includes("fetch failed") || 
                              errorMessage.includes("ECONNREFUSED") ||
                              errorMessage.includes("Connection refused");
    
    return json(
      { 
        error: "Failed to connect to backend API",
        details: errorMessage,
        apiUrl: API_URL
      },
      { status: isConnectionError ? 503 : 500 }
    );
  }
};

export const DELETE: RequestHandler = async () => {
  try {
    const deletedCount = await client.requests.deleteAll();
    return json({ deletedCount });
  } catch (error) {
    console.error("Failed to delete all requests:", error);
    
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
