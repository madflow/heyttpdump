import { useEffect, useRef, useState } from "react";
import { deleteAllRequests, deleteRequest, fetchRequests } from "#lib/api.ts";
import type { Request } from "#lib/types.ts";
import Header from "./Header.tsx";
import Pagination from "./Pagination.tsx";
import RequestList from "./RequestList.tsx";

const REQUESTS_PER_PAGE = 10;
const POLLING_INTERVAL_MS = 1000;

export default function Dashboard() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);
  const [revision, setRevision] = useState(0);
  const deleting = useRef(false);
  const cancelPolling = useRef<() => void>(() => {});

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (loading) return;
    let active = true;
    let inFlight = false;
    const controller = new AbortController();
    async function loadRequests() {
      if (inFlight || deleting.current) return;
      inFlight = true;
      try {
        const data = await fetchRequests(
          REQUESTS_PER_PAGE,
          page * REQUESTS_PER_PAGE,
          controller.signal,
        );
        if (active && !deleting.current) setRequests(data);
      } catch (error) {
        if (active && !controller.signal.aborted) console.error("Failed to fetch requests:", error);
      } finally {
        inFlight = false;
      }
    }
    void loadRequests();
    const interval = setInterval(() => void loadRequests(), POLLING_INTERVAL_MS);
    const cancel = () => {
      active = false;
      controller.abort();
      clearInterval(interval);
    };
    cancelPolling.current = cancel;
    return cancel;
  }, [page, loading, revision]);

  async function remove(id?: number) {
    if (deleting.current) return;
    if (id === undefined && !confirm("Are you sure you want to delete all requests?")) return;
    deleting.current = true;
    cancelPolling.current();
    setLoading(true);
    try {
      if (id === undefined) await deleteAllRequests();
      else await deleteRequest(id);
      setRevision((value) => value + 1);
    } catch (error) {
      console.error(
        id === undefined ? "Failed to delete all requests:" : "Failed to delete request:",
        error,
      );
    } finally {
      deleting.current = false;
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto p-6">
        <Header
          requestsCount={requests.length}
          loading={loading}
          onDeleteAll={() => void remove()}
        />
        {!mounted ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">Loading...</div>
        ) : requests.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            No requests received yet
          </div>
        ) : (
          <>
            <RequestList
              requests={requests}
              expandedId={expandedId}
              loading={loading}
              onToggleExpand={(id) => setExpandedId((current) => (current === id ? null : id))}
              onDelete={(id) => void remove(id)}
            />
            <Pagination
              page={page}
              loading={loading}
              hasMore={requests.length >= REQUESTS_PER_PAGE}
              onPrevious={() => setPage((current) => Math.max(0, current - 1))}
              onNext={() => setPage((current) => current + 1)}
            />
          </>
        )}
      </div>
    </div>
  );
}
