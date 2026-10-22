import { apiCall } from "../../shared/lib/api";
import type { User } from "./session";
import { ApiResponse } from "../../shared/lib/types";

export const AuthApi = {
  login: (payload: {
    identifier?: string;
    username?: string;
    password: string;
  }) => apiCall("auth.login", { data: payload }).then((r) => r.data),
  updateProfile: async (payload: { name: string }): Promise<User> => {
    const res = await apiCall<ApiResponse<User>>("auth.updateProfile", { data: payload });
    if (!res.data.success || !res.data.data) throw new Error(res.data.message || "Không thể lưu hồ sơ");
    return res.data.data;
  },
  changePassword: async (payload: { currentPassword: string; newPassword: string }): Promise<void> => {
    const res = await apiCall<ApiResponse<{ ok: boolean }>>("auth.changePassword", { data: payload });
    if (!res.data.success || !res.data.data?.ok) throw new Error(res.data.message || "Không thể đổi mật khẩu");
  },
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
