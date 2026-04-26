export interface ApiError {
  message: string;
  status?: number;
}

export interface PaginatedResult<T> {
  items: T[];
  totalCount: number;
}
