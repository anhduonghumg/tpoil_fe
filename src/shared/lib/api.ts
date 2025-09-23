import { buildPath, ROUTES } from "../../config/routes";
import { http } from "./http";

export async function apiCall<T = unknown>(
  key: `${keyof typeof ROUTES}.${string}`,
  opts?: { params?: Record<string, string | number>; query?: any; data?: any }
) {
  const [ns, name] = key.split(".") as [keyof typeof ROUTES, string];
  const routeEntry = ROUTES[ns][name as keyof (typeof ROUTES)[typeof ns]] as [
    string,
    string
  ];
  const [method, rawPath] = routeEntry;
  const url = buildPath(rawPath, opts?.params);
  return http.request<T>({
    method,
    url,
    params: opts?.query,
    data: opts?.data,
  });
}
