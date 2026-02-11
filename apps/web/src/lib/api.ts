import { createClient } from "@repo/orpc";

const API_URL = import.meta.env.VITE_API_URL;

const client = createClient(API_URL);

export { client };
