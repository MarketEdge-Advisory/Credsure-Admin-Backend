export interface SuccessResponse<T> {
  status: boolean;
  message: string;
  data: T;
}

export function successResponse<T>(
  message: string,
  data: T,
): SuccessResponse<T> {
  return {
    status: true,
    message,
    data,
  };
}
