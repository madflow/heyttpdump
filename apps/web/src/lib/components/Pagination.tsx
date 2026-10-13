export interface PaginationProps {
  page: number;
  loading: boolean;
  hasMore: boolean;
  onPrevious: () => void;
  onNext: () => void;
}
export default function Pagination({
  page,
  loading,
  hasMore,
  onPrevious,
  onNext,
}: PaginationProps) {
  return (
    <div className="mt-6 flex items-center justify-between">
      <button
        onClick={onPrevious}
        disabled={page === 0 || loading}
        className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Previous
      </button>
      <span className="text-sm text-gray-600 dark:text-gray-400">Page {page + 1}</span>
      <button
        onClick={onNext}
        disabled={!hasMore || loading}
        className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Next
      </button>
    </div>
  );
}
