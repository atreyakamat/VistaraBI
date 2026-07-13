"use client";

import { useState, useCallback, useEffect } from "react";
import { api, ApiResponse } from "../api/client";

interface UseApiOptions<T> {
  immediate?: boolean;
  onSuccess?: (data: T) => void;
  onError?: (error: string) => void;
}

export function useApi<T>(
  method: "get" | "post" | "put" | "delete",
  endpoint: string,
  options: UseApiOptions<T> = {}
) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(!!options.immediate);

  const execute = useCallback(
    async (body?: any, customEndpoint?: string) => {
      setLoading(true);
      setError(null);

      const targetEndpoint = customEndpoint || endpoint;
      let response: ApiResponse<T>;

      switch (method) {
        case "get":
          response = await api.get<T>(targetEndpoint);
          break;
        case "post":
          response = await api.post<T>(targetEndpoint, body);
          break;
        case "put":
          response = await api.put<T>(targetEndpoint, body);
          break;
        case "delete":
          response = await api.delete<T>(targetEndpoint);
          break;
      }

      if (response.error) {
        setError(response.error);
        options.onError?.(response.error);
      } else if (response.data) {
        setData(response.data);
        options.onSuccess?.(response.data);
      }

      setLoading(false);
      return response;
    },
    [method, endpoint, options]
  );

  useEffect(() => {
    if (options.immediate) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      execute(undefined, undefined);
    }
  }, [options.immediate, execute]);

  return { data, error, loading, execute };
}
