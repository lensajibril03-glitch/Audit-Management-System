import Link from "next/link";

type Props = {
  basePath: string;
  page: number;
  totalPages: number;
  query?: Record<string, string | undefined>;
};

function buildHref(basePath: string, page: number, query?: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  params.set("page", String(page));
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value) params.set(key, value);
    }
  }
  return `${basePath}?${params.toString()}`;
}

export default function Pagination({ basePath, page, totalPages, query }: Props) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center gap-2 text-sm">
      <Link
        href={buildHref(basePath, Math.max(1, page - 1), query)}
        className="rounded-md border border-border bg-white px-3 py-1"
      >
        Previous
      </Link>
      <span className="text-muted">
        Page {page} of {totalPages}
      </span>
      <Link
        href={buildHref(basePath, Math.min(totalPages, page + 1), query)}
        className="rounded-md border border-border bg-white px-3 py-1"
      >
        Next
      </Link>
    </div>
  );
}
