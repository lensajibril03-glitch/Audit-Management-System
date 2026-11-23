export function backendApiUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_BACKEND_API_BASE_URL || "";
  if (!base) {
    return path;
  }

  const normalizedBase = base.endsWith("/") ? base.slice(0, -1) : base;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
}
