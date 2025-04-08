import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

type RequestOptions = {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
};

export async function apiRequest<T = any>(
  url: string,
  options?: RequestOptions
): Promise<T> {
  // Log the request for debugging
  console.log('API Request:', url, options);
  
  try {
    const res = await fetch(url, {
      method: options?.method || 'GET',
      headers: options?.headers || {},
      body: options?.body,
      credentials: "include",
    });

    console.log('API Response:', url, res.status, res.statusText);
    
    await throwIfResNotOk(res);
    
    // If it's a no-content response (204), return empty object
    if (res.status === 204) {
      return {} as T;
    }
    
    // Otherwise parse and return the JSON response
    const data = await res.json();
    console.log('API Data:', url, data);
    return data as T;
  } catch (error) {
    console.error('API Error:', url, error);
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
