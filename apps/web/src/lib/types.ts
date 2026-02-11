export interface RequestPayload {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: string;
}

export interface Request {
  id: number;
  createdAt: string;
  payload: RequestPayload;
}
