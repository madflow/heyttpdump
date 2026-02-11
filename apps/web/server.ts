import { Hono } from "hono";
import { Context } from "hono";

const DEFAULT_WEB_PORT = 3002;
const DEFAULT_API_URL = "http://localhost:3001/rpc";
const DIST_DIR = "apps/web/dist";

// Configuration
const WEB_PORT = Number(Deno.env.get("WEB_PORT")) || DEFAULT_WEB_PORT;
const API_URL = Deno.env.get("API_URL") || DEFAULT_API_URL;

const CONTENT_TYPES: Record<string, string> = {
  'html': 'text/html',
  'css': 'text/css',
  'js': 'application/javascript',
  'json': 'application/json',
  'png': 'image/png',
  'jpg': 'image/jpeg',
  'jpeg': 'image/jpeg',
  'gif': 'image/gif',
  'svg': 'image/svg+xml',
  'ico': 'image/x-icon',
} as const;

const DEFAULT_CONTENT_TYPE = 'application/octet-stream';

function getContentType(filePath: string): string {
  const extension = filePath.split('.').pop()?.toLowerCase();
  return CONTENT_TYPES[extension || ''] || DEFAULT_CONTENT_TYPE;
}

function isBodyAllowedForMethod(method: string): boolean {
  return method !== "GET" && method !== "HEAD";
}

async function createProxyResponse(targetUrl: URL, request: Request): Promise<Response> {
  const headers = new Headers(request.headers);
  headers.delete("host");

  const response = await fetch(targetUrl.toString(), {
    method: request.method,
    headers,
    body: isBodyAllowedForMethod(request.method) ? request.body : undefined,
  });

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}

const app = new Hono();

// Proxy API requests to the API server
app.all("/api/*", async (c: Context) => {
  const path = c.req.path.replace(/^\/api/, "");
  const targetUrl = new URL(path, API_URL.replace(/\/rpc$/, ""));
  targetUrl.pathname = "/rpc" + targetUrl.pathname;

  return createProxyResponse(targetUrl, c.req.raw);
});

// Serve static files from the dist directory
async function serveStaticFile(filePath: string): Promise<Response> {
  try {
    const file = await Deno.open(filePath, { read: true });
    const stat = await file.stat();

    return new Response(file.readable, {
      status: 200,
      headers: {
        'content-type': getContentType(filePath),
        'content-length': stat.size.toString(),
      },
    });
  } catch {
    return new Response('Not Found', { status: 404 });
  }
}

function normalizeRequestPath(path: string): string {
  return path === '/' ? '/index.html' : path;
}

function shouldFallbackToIndex(response: Response, requestPath: string): boolean {
  return response.status === 404 && !requestPath.includes('.');
}

app.get("*", async (c: Context) => {
  const requestPath = normalizeRequestPath(c.req.path);
  const filePath = `${DIST_DIR}${requestPath}`;
  
  let response = await serveStaticFile(filePath);
  
  // SPA fallback: serve index.html for routes without file extensions
  if (shouldFallbackToIndex(response, requestPath)) {
    response = await serveStaticFile(`${DIST_DIR}/index.html`);
  }
  
  return response;
});

console.log(`Web server starting on port ${WEB_PORT}`);
console.log(`Proxying /api/* to ${API_URL}`);

Deno.serve({ port: WEB_PORT }, app.fetch);
