import type { Request } from "#lib/types.ts";
import RequestItem from "./RequestItem.tsx";

export interface RequestListProps {
  requests: Request[];
  expandedId: number | null;
  loading: boolean;
  onToggleExpand: (id: number) => void;
  onDelete: (id: number) => void;
}
export default function RequestList({
  requests,
  expandedId,
  loading,
  onToggleExpand,
  onDelete,
}: RequestListProps) {
  return (
    <div className="space-y-3">
      {requests.map((request) => (
        <RequestItem
          key={request.id}
          request={request}
          isExpanded={expandedId === request.id}
          loading={loading}
          onToggleExpand={() => onToggleExpand(request.id)}
          onDelete={() => onDelete(request.id)}
        />
      ))}
    </div>
  );
}
