export const toAbsUrl = (url?: string | null) => {
  if (!url) return undefined;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;

  // Upload service returns /static/... while Vite runs on port 5173 in dev.
  // Resolve relative files against the API server, not the frontend router.
  const apiOrigin = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? "http://localhost:3000" : "");
  return `${apiOrigin}${url}`;
};
