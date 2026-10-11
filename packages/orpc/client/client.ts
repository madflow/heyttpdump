import type { ContractRouterClient } from "@orpc/contract";
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";

import { appContract, type AppContract } from "../contract/index.ts";

export type RpcFetch = (request: Request, init: RequestInit) => Promise<Response>;

export function createClient(url: string, fetch?: RpcFetch) {
  const link = new RPCLink({ url, fetch });
  return createORPCClient(link) as ContractRouterClient<typeof appContract>;
}

export type { ContractRouterClient as RouterClient } from "@orpc/contract";
export type { AppContract };
