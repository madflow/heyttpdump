import { oc } from "@orpc/contract";
import * as v from "valibot";

// Core schemas
const payloadSchema = v.object({
  method: v.string(),
  url: v.string(),
  headers: v.record(v.string(), v.string()),
  body: v.string(),
});

const requestSchema = v.object({
  id: v.number(),
  createdAt: v.string(),
  payload: payloadSchema,
});

// Input schemas
const idInputSchema = v.object({ id: v.number() });
const payloadInputSchema = v.object({ payload: payloadSchema });
const paginationInputSchema = v.object({
  limit: v.number(),
  offset: v.number(),
});

// Contract definitions
const createRequestContract = oc
  .input(payloadInputSchema)
  .output(requestSchema);

const deleteRequestContract = oc
  .input(idInputSchema)
  .output(v.boolean());

const getRequestContract = oc
  .input(idInputSchema)
  .output(requestSchema);

const listRequestsContract = oc
  .input(paginationInputSchema)
  .output(v.array(requestSchema));

const deleteAllRequestsContract = oc.output(v.number());

export const appContract = {
  requests: {
    create: createRequestContract,
    delete: deleteRequestContract,
    deleteAll: deleteAllRequestsContract,
    get: getRequestContract,
    list: listRequestsContract,
  },
};

export type AppContract = typeof appContract;
export { payloadSchema, requestSchema };
