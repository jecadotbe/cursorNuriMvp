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
    const response = await fetch(url, {
      method,
      headers: {
        ...(body ? { "Content-Type": "application/json" } : {}),
        // Prevent caching
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      },
      body: body ? JSON.stringify(body) : undefined,
      credentials: "include",
    });

    if (!response.ok) {
      const message = await response.text();
      return { ok: false, message };
    }

    const data = await response.json();
    return { ok: true, message: data.message };
  } catch (e: any) {
    return { ok: false, message: e.toString() };
  }
}

async function fetchUser(): Promise<User | null> {
  try {
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
        return null;
      }
      throw new Error(`${response.status}: ${await response.text()}`);
    }

    return response.json();
  } catch (error) {
    console.error('Error fetching user:', error);
    return null;
  }
}

export function useUser() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: user, error, isLoading } = useQuery<User | null, Error>({
    queryKey: ['user'],
    queryFn: fetchUser,
    retry: false,
    staleTime: 0, // Always fetch fresh data
    gcTime: 0, // Don't cache the result
    refetchOnWindowFocus: true, // Refetch when window gains focus
    initialData: null, // Start with null user by default
  });

  const loginMutation = useMutation<RequestResult, Error, InsertUser>({
    mutationFn: (userData) => handleRequest('/api/login', 'POST', userData),
    onSuccess: (result) => {
      queryClient.removeQueries(); // Remove all queries from cache
      if (result.ok) {
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
      // Optimistically clear user data
      const previousData = queryClient.getQueryData(['user']);
      queryClient.setQueryData(['user'], null);
      return { previousData };
    },
    onSuccess: (result) => {
      queryClient.removeQueries(); // Clear all queries
      if (result.ok) {
        toast({
          title: "Success",
          description: result.message,
        });
      }
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries(); // Invalidate all queries
      // Force a hard refresh to clear any cached state
      window.location.href = '/';
    }
  });

  const registerMutation = useMutation<RequestResult, Error, InsertUser>({
    mutationFn: (userData) => handleRequest('/api/register', 'POST', userData),
    onSuccess: (result) => {
      queryClient.removeQueries(); // Remove all queries from cache
      if (result.ok) {
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
    user: user ?? null, // Ensure we always return null when no user
    isLoading,
    error,
    login: loginMutation.mutateAsync,
    logout: logoutMutation.mutateAsync,
    register: registerMutation.mutateAsync,
  };
}