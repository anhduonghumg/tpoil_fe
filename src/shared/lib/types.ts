export type ApiResponse<T = any> = {
  statusCode: number;
  success: boolean;
  message: string;
  timestamp: string;
  requestId?: string;
  data?: T;
  error?: { code: string; details?: any };
};
