import { apiCall } from "../../shared/lib/api";
import { ApiResponse } from "../../shared/lib/types";

export const AuthApi = {
  login: (payload: {
    identifier?: string;
    username?: string;
    password: string;
  }) => apiCall("auth.login", { data: payload }).then((r) => r.data),
  logout: () => apiCall("auth.logout").then((r) => r.data),
  me: async () => {
    const res = await apiCall<
      ApiResponse<{ id: string; email: string; name: string }>
    >("auth.me");
    if (!res.data?.success || !res.data?.data)
      throw new Error(res.data?.message || "ME_FAILED");
    return res.data.data;
  },
};
