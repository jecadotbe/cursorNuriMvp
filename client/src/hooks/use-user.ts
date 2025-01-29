import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { InsertUser, User } from "@db/schema";
import { useToast } from '@/hooks/use-toast';

type RequestResult = {
  ok: true;
  message?: string;
} | {
  ok: false;
  message: string;
};

async function handleRequest(
  url: string,
  method: string,
  body?: InsertUser
): Promise<RequestResult> {
  try {
    console.log(`[Auth] Making ${method} request to ${url}`);
    const response = await fetch(url, {
      method,
      headers: {
        ...(body ? { "Content-Type": "application/json" } : {}),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      },
      body: body ? JSON.stringify(body) : undefined,
      credentials: "include",
    });

    const message = await response.text();
    const isJson = message.startsWith('{');
    const result = isJson ? JSON.parse(message) : { message };

    if (!response.ok) {
      console.log(`[Auth] Request failed: ${response.status}`, result);
      return { ok: false, message: result.message || 'Request failed' };
    }

    console.log(`[Auth] Request succeeded:`, result);
    return { ok: true, message: result.message };
  } catch (e: any) {
    console.error('[Auth] Request error:', e);
    return { ok: false, message: e.toString() };
  }
}

async function fetchUser(): Promise<User | null> {
  try {
    console.log('[Auth] Fetching user data...');
    const response = await fetch('/api/user', {
      credentials: 'include',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

    if (!response.ok) {
      if (response.status === 401) {
        console.log('[Auth] User not authenticated');
        return null;
      }
      const error = await response.text();
      console.error('[Auth] Error fetching user:', error);
      throw new Error(error);
    }

    const userData = await response.json();
    console.log('[Auth] User data fetched:', userData);
    return userData;
  } catch (error) {
    console.error('[Auth] Error in fetchUser:', error);
    throw error; // Let React Query handle the error
  }
}

export function useUser() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: user, error, isLoading } = useQuery<User | null, Error>({
    queryKey: ['user'],
    queryFn: fetchUser,
    retry: false,
    refetchOnWindowFocus: false, // Disable auto-refetch on window focus
    refetchOnMount: true,
    refetchOnReconnect: true,
  });

  const loginMutation = useMutation<RequestResult, Error, InsertUser>({
    mutationFn: (userData) => handleRequest('/api/login', 'POST', userData),
    onSuccess: (result) => {
      if (result.ok) {
        // Clear all queries before refetching user
        queryClient.clear();
        queryClient.invalidateQueries({ queryKey: ['user'] });
        toast({
          title: "Success",
          description: result.message,
        });
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: result.message,
        });
      }
    },
    onError: (error) => {
      queryClient.setQueryData(['user'], null);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  });

  const logoutMutation = useMutation<RequestResult, Error>({
    mutationFn: () => handleRequest('/api/logout', 'POST'),
    onMutate: () => {
      // Immediately set user to null
      queryClient.setQueryData(['user'], null);
    },
    onSuccess: (result) => {
      if (result.ok) {
        // Clear all query cache
        queryClient.clear();
        // Reload the page to reset all state
        window.location.href = '/';
      }
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  });

  const registerMutation = useMutation<RequestResult, Error, InsertUser>({
    mutationFn: (userData) => handleRequest('/api/register', 'POST', userData),
    onSuccess: (result) => {
      if (result.ok) {
        // Clear all queries before refetching user
        queryClient.clear();
        queryClient.invalidateQueries({ queryKey: ['user'] });
        toast({
          title: "Success",
          description: result.message,
        });
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: result.message,
        });
      }
    },
    onError: (error) => {
      queryClient.setQueryData(['user'], null);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  });

  return {
    user: user ?? null,
    isLoading,
    error,
    login: loginMutation.mutateAsync,
    logout: logoutMutation.mutateAsync,
    register: registerMutation.mutateAsync,
  };
}