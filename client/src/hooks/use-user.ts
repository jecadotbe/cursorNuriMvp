import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { InsertUser, User } from "@db/schema";
import { useToast } from '@/hooks/use-toast';
import { useCallback, useEffect } from 'react';

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
        // Add cache-busting headers
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      },
      body: body ? JSON.stringify(body) : undefined,
      credentials: "include",
    });

    if (!response.ok) {
      if (response.status >= 500) {
        return { ok: false, message: response.statusText };
      }

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
}

export function useUser() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Helper to clear all auth-related data
  const clearAuthData = useCallback(() => {
    queryClient.clear(); // Clear all queries
    queryClient.setQueryData(['user'], null);
  }, [queryClient]);

  const checkSession = useCallback(async () => {
    try {
      await queryClient.invalidateQueries({ queryKey: ['user'] });
      const response = await fetch('/api/user', { 
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });

      if (!response.ok) {
        clearAuthData();
        throw new Error('Session check failed');
      }
    } catch (error) {
      clearAuthData();
      console.error('Session check error:', error);
    }
  }, [queryClient, clearAuthData]);

  const { data: user, error, isLoading } = useQuery<User | null, Error>({
    queryKey: ['user'],
    queryFn: fetchUser,
    retry: false,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    onError: () => {
      clearAuthData();
    }
  });

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  const loginMutation = useMutation<RequestResult, Error, InsertUser>({
    mutationFn: (userData) => handleRequest('/api/login', 'POST', userData),
    onSuccess: (result) => {
      if (result.ok) {
        queryClient.invalidateQueries({ queryKey: ['user'] });
        toast({
          title: "Success",
          description: result.message,
        });
      }
    },
    onError: (error) => {
      clearAuthData();
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  });

  const logoutMutation = useMutation<RequestResult, Error>({
    mutationFn: () => handleRequest('/api/logout', 'POST'),
    onSuccess: (result) => {
      if (result.ok) {
        clearAuthData();
        toast({
          title: "Success",
          description: result.message,
        });
      }
    },
    onError: (error) => {
      clearAuthData();
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
        queryClient.invalidateQueries({ queryKey: ['user'] });
        toast({
          title: "Success",
          description: result.message,
        });
      }
    },
    onError: (error) => {
      clearAuthData();
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  });

  return {
    user,
    isLoading,
    error,
    checkSession,
    login: loginMutation.mutateAsync,
    logout: logoutMutation.mutateAsync,
    register: registerMutation.mutateAsync,
  };
}