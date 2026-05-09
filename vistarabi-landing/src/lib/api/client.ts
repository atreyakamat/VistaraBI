import { AI_MODE_HEADER_KEY, readClientAIMode } from '@/lib/ai/ai-mode';

export type ApiResponse<T> = {
  data?: T;
  error?: string;
  status: number;
};

class ApiClient {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(endpoint, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...(typeof window !== 'undefined' ? { [AI_MODE_HEADER_KEY]: readClientAIMode() } : {}),
          ...options.headers,
        },
      });

      const status = response.status;
      
      if (status === 204) {
        return { status };
      }

      const data = await response.json();

      if (!response.ok) {
        return {
          error: data.error || data.message || "An unexpected error occurred",
          status,
        };
      }

      return { data, status };
    } catch (error) {
      console.error(`API Error [${endpoint}]:`, error);
      return {
        error: error instanceof Error ? error.message : "Network error",
        status: 500,
      };
    }
  }

  get<T>(endpoint: string, options?: RequestInit) {
    return this.request<T>(endpoint, { ...options, method: "GET" });
  }

  post<T>(endpoint: string, body?: any, options?: RequestInit) {
    return this.request<T>(endpoint, {
      ...options,
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  put<T>(endpoint: string, body?: any, options?: RequestInit) {
    return this.request<T>(endpoint, {
      ...options,
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  delete<T>(endpoint: string, options?: RequestInit) {
    return this.request<T>(endpoint, { ...options, method: "DELETE" });
  }
}

export const api = new ApiClient();
