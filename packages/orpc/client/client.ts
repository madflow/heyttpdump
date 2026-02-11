import type { ContractRouterClient } from "@orpc/contract";
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";

import { appContract, type AppContract } from "../contract/index.ts";

export function createClient(url: string) {
  const link = new RPCLink({ url });
  return createORPCClient(link) as ContractRouterClient<typeof appContract>;
}

export type { ContractRouterClient as RouterClient } from "@orpc/contract";
export type { AppContract };
