import { createFileRoute } from "@tanstack/react-router";
import { listRequests, removeAllRequests } from "#lib/server/request-proxy.ts";

export const Route = createFileRoute("/api/requests")({
  server: {
    handlers: {
      GET: ({ request }) => listRequests(request),
      DELETE: ({ request }) => removeAllRequests(request),
    },
  },
});
