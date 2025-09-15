import { apiCall } from "../../shared/lib/api";
import { User } from "./session";

type MeResponse = {
  statusCode: number
  success: boolean
  data: { id: string; email: string; fullname: string }
}
type LoginResp = { user: User } | { data: { user: User } }

export const AuthApi = {
  login: (payload: { email?: string; username?: string; password: string }) =>
  apiCall("auth.login", { data: payload }).then((r) => r.data),
  logout: () => apiCall("auth.logout").then((r) => r.data),
  me: async () => {
    const res = await apiCall<MeResponse>('auth.me')
    return res.data.data as User
  },
};
