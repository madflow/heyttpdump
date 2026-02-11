import { ORPCError, implement } from "@orpc/server";

import { appContract } from "@repo/orpc";
import * as db from "./db.ts";

const impl = implement(appContract);

// Helper to validate request existence
function ensureRequestExists<T>(result: T | null, errorMessage = "Request not found"): T {
  if (!result) {
    throw new ORPCError("NOT_FOUND", { message: errorMessage });
  }
  return result;
}

const createRequest = impl.requests.create.handler(({ input }) => 
  db.createRequest(input.payload)
);

const deleteRequest = impl.requests.delete.handler(({ input }) => {
  ensureRequestExists(db.deleteRequest(input.id));
  return true;
});

const getRequest = impl.requests.get.handler(({ input }) => 
  ensureRequestExists(db.getRequest(input.id))
);

const listRequests = impl.requests.list.handler(({ input }) => 
  db.listRequests(input.limit, input.offset)
);

const deleteAllRequests = impl.requests.deleteAll.handler(() => 
  db.deleteAllRequests()
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
