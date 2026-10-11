export interface PayloadInput {
  method: string;
  url: string;
  headers: Record<string, string>;
  body: string;
}

export interface RequestOutput {
  id: number;
  createdAt: string;
  payload: PayloadInput;
}

/** Runtime-neutral boundary shared by Node SQLite and Cloudflare D1 adapters. */
export interface RequestRepository {
  createRequest(payload: PayloadInput): Promise<RequestOutput>;
  getRequest(id: number): Promise<RequestOutput | null>;
  listRequests(limit: number, offset: number): Promise<RequestOutput[]>;
  deleteRequest(id: number): Promise<RequestOutput | null>;
  deleteAllRequests(): Promise<number>;
  checkReady(): Promise<void>;
}
