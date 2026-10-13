import ThemeToggle from "./ThemeToggle.tsx";

export interface HeaderProps {
  requestsCount: number;
  loading: boolean;
  onDeleteAll: () => void;
}
export default function Header({ requestsCount, loading, onDeleteAll }: HeaderProps) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">HTTP Requests</h1>
      <div className="flex items-center gap-4">
        <ThemeToggle />
        <button
          onClick={onDeleteAll}
          disabled={loading || requestsCount === 0}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Delete All
        </button>
      </div>
    </div>
  );
}
