// shared/lib/url.ts
export const toAbsUrl = (u?: string | null) => {
  if (!u) return undefined;
  if (u.startsWith("http://") || u.startsWith("https://")) return u;
  // nếu server và FE cùng origin:
  // return `${window.location.origin}${u}`;
  // hoặc nếu backend khác domain:
//   console.log(`${import.meta.env.VITE_API_URL || ""}${u}`);
  return `${import.meta.env.VITE_API_URL || ""}${u}`;
};
