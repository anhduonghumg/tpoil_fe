import { apiCall } from "../../shared/lib/api";
import { AppBootstrapResponse } from "./types";

export async function getAppBootstrap(): Promise<AppBootstrapResponse> {
  const response = await apiCall<AppBootstrapResponse>("app.bootstrap");
  return response?.data!;
  // const res = await apiCall<ApiResponse<any>>("app.bootstrap");
  // if (!res.data?.success)
  //   throw new Error(res.data?.message || "BOOTSTRAP_FAILED");
  // return res.data;
}
