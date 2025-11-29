import { apiCall } from "../../shared/lib/api";
import { AppBootstrapResponse } from "./types";

export async function getAppBootstrap(): Promise<AppBootstrapResponse> {
  const response = await apiCall<AppBootstrapResponse>("app.bootstrap");
  return response?.data!?.data!;
}
