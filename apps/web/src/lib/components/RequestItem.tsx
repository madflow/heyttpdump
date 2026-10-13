import type { Request } from "#lib/types.ts";
import { getPathFromUrl } from "#lib/utils.ts";
import MethodBadge from "./MethodBadge.tsx";
import RequestDetails from "./RequestDetails.tsx";

export interface RequestItemProps {
  request: Request;
  isExpanded: boolean;
  loading: boolean;
  onToggleExpand: () => void;
  onDelete: () => void;
}
export default function RequestItem({
  request,
  isExpanded,
  loading,
  onToggleExpand,
  onDelete,
}: RequestItemProps) {
  return (
    <div className="min-w-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="grid min-w-0 flex-1 grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 gap-y-2 md:grid-cols-[auto_minmax(0,1fr)_auto]">
          <MethodBadge method={request.payload.method} />
          <code
            className="block min-w-0 truncate text-sm text-gray-700 dark:text-gray-300"
            title={getPathFromUrl(request.payload.url)}
          >
            {getPathFromUrl(request.payload.url)}
          </code>
          <span className="col-span-2 whitespace-nowrap text-xs text-gray-500 dark:text-gray-400 md:col-span-1">
            {new Date(request.createdAt).toLocaleString()}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2 self-end sm:self-auto">
          <button
            onClick={onToggleExpand}
            className="px-3 py-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            {isExpanded ? "Collapse" : "Expand"}
          </button>
          <button
            onClick={onDelete}
            disabled={loading}
            className="px-3 py-1 text-sm text-red-600 hover:text-red-800 border border-red-300 dark:border-red-700 rounded hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
          >
            Delete
          </button>
        </div>
      </div>
      {isExpanded && (
        <RequestDetails
          url={request.payload.url}
          headers={request.payload.headers}
          body={request.payload.body}
        />
      )}
    </div>
  );
}
