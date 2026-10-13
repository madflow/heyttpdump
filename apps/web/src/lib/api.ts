import type { Request } from "./types.ts";

export async function fetchRequests(
  limit: number,
  offset: number,
  signal?: AbortSignal,
): Promise<Request[]> {
  const response = await fetch(`/api/requests?limit=${limit}&offset=${offset}`, { signal });
  if (!response.ok) throw new Error("Failed to fetch requests");
  return response.json();
}

export async function deleteRequest(id: number): Promise<void> {
  const response = await fetch(`/api/requests/${id}`, {
    method: "DELETE",
    headers: { "content-type": "application/json" },
  });
  if (!response.ok) throw new Error("Failed to delete request");
}

export async function deleteAllRequests(): Promise<void> {
  const response = await fetch("/api/requests", {
    method: "DELETE",
    headers: { "content-type": "application/json" },
  });
  if (!response.ok) throw new Error("Failed to delete all requests");
}
