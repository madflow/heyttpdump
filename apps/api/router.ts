import { ORPCError, implement } from "@orpc/server";

import { appContract } from "@repo/orpc";
import type { RequestRepository } from "./request-repository.ts";

export interface ApiContext {
  repository: RequestRepository;
}

const impl = implement(appContract).$context<ApiContext>();

// Helper to validate request existence
function ensureRequestExists<T>(result: T | null, errorMessage = "Request not found"): T {
  if (!result) {
    throw new ORPCError("NOT_FOUND", { message: errorMessage });
  }
  return result;
}

const createRequest = impl.requests.create.handler(({ input, context }) =>
  context.repository.createRequest(input.payload),
);

const deleteRequest = impl.requests.delete.handler(async ({ input, context }) => {
  ensureRequestExists(await context.repository.deleteRequest(input.id));
  return true;
});

const getRequest = impl.requests.get.handler(async ({ input, context }) =>
  ensureRequestExists(await context.repository.getRequest(input.id)),
);

const listRequests = impl.requests.list.handler(({ input, context }) =>
  context.repository.listRequests(input.limit, input.offset),
);

const deleteAllRequests = impl.requests.deleteAll.handler(({ context }) =>
  context.repository.deleteAllRequests(),
);

export const router = {
  requests: {
    create: createRequest,
    delete: deleteRequest,
    deleteAll: deleteAllRequests,
    get: getRequest,
    list: listRequests,
  },
};

export type AppRouter = typeof router;
