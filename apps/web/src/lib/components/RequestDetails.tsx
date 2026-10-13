export interface RequestDetailsProps {
  url?: string;
  headers: Record<string, string>;
  body?: string;
}
export default function RequestDetails({ url, headers, body }: RequestDetailsProps) {
  let formattedBody = body || "";
  const contentType = Object.entries(headers).find(
    ([key]) => key.toLowerCase() === "content-type",
  )?.[1];
  if (body && contentType?.includes("application/json")) {
    try {
      formattedBody = JSON.stringify(JSON.parse(body), null, 2);
    } catch {
      // Preserve raw bodies that are not valid JSON.
    }
  }
  return (
    <div className="min-w-0 mt-4 space-y-3 border-t border-gray-100 dark:border-gray-700 pt-3">
      {url && (
        <div>
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">URL</h4>
          <pre
            tabIndex={0}
            role="region"
            aria-label="Request URL"
            className="max-w-full text-xs bg-gray-50 dark:bg-gray-900 p-3 rounded overflow-x-auto text-gray-600 dark:text-gray-400"
          >
            {url}
          </pre>
        </div>
      )}
      <div>
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Headers</h4>
        <pre className="text-xs bg-gray-50 dark:bg-gray-900 p-3 rounded overflow-x-auto text-gray-600 dark:text-gray-400">
          {JSON.stringify(headers, null, 2)}
        </pre>
      </div>
      {body && (
        <div>
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Body</h4>
          <pre className="text-xs bg-gray-50 dark:bg-gray-900 p-3 rounded overflow-x-auto text-gray-600 dark:text-gray-400">
            {formattedBody}
          </pre>
        </div>
      )}
    </div>
  );
}
