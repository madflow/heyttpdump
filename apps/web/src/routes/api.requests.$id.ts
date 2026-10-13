import { createFileRoute } from "@tanstack/react-router";
import { removeRequest } from "#lib/server/request-proxy.ts";

export const Route = createFileRoute("/api/requests/$id")({
  server: {
    handlers: {
      DELETE: ({ request, params }) => removeRequest(request, params.id),
    },
  },
});
