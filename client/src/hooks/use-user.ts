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
  console.log(`[Auth Debug] Making ${method} request to ${url}`, { body });
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

    console.log(`[Auth Debug] Response status:`, response.status);

    if (!response.ok) {
      if (response.status >= 500) {
        return { ok: false, message: response.statusText };
      }

      const message = await response.text();
      console.log(`[Auth Debug] Error response:`, message);
      return { ok: false, message };
    }

    const data = await response.json();
    console.log(`[Auth Debug] Success response:`, data);
    return { ok: true, message: data.message };
  } catch (e: any) {
    console.error('[Auth Debug] Request error:', e);
    return { ok: false, message: e.toString() };
  }
}

async function fetchUser(): Promise<User | null> {
  console.log('[Auth Debug] Fetching user data');
  const response = await fetch('/api/user', {
    credentials: 'include',
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  });

  console.log('[Auth Debug] User fetch response:', {
    status: response.status,
    ok: response.ok,
    headers: Object.fromEntries(response.headers.entries())
  });

  if (!response.ok) {
    if (response.status === 401) {
      console.log('[Auth Debug] User not authenticated (401)');
      return null;
    }

    throw new Error(`${response.status}: ${await response.text()}`);
  }

  const userData = await response.json();
  console.log('[Auth Debug] Fetched user data:', userData);
  return userData;
}

export function useUser() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Helper to clear all auth-related data
  const clearAuthData = useCallback(() => {
    console.log('[Auth Debug] Clearing all auth data');
    queryClient.clear(); // Clear all queries
    queryClient.setQueryData(['user'], null);
    console.log('[Auth Debug] Current cache state after clear:', {
      user: queryClient.getQueryData(['user']),
      queries: queryClient.getQueryCache().findAll()
    });
  }, [queryClient]);

  const checkSession = useCallback(async () => {
    console.log('[Auth Debug] Checking session');
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

      console.log('[Auth Debug] Session check response:', {
        status: response.status,
        ok: response.ok
      });

      if (!response.ok) {
        clearAuthData();
        throw new Error('Session check failed');
      }
    } catch (error) {
      clearAuthData();
      console.error('[Auth Debug] Session check error:', error);
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
      console.log('[Auth Debug] Query error, clearing auth data');
      clearAuthData();
    }
  });

  useEffect(() => {
    console.log('[Auth Debug] Initial mount, current user state:', user);
    checkSession();
  }, [checkSession]);

  const loginMutation = useMutation<RequestResult, Error, InsertUser>({
    mutationFn: (userData) => handleRequest('/api/login', 'POST', userData),
    onSuccess: (result) => {
      console.log('[Auth Debug] Login success:', result);
      if (result.ok) {
        queryClient.invalidateQueries({ queryKey: ['user'] });
        toast({
          title: "Success",
          description: result.message,
        });
      }
    },
    onError: (error) => {
      console.error('[Auth Debug] Login error:', error);
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
      console.log('[Auth Debug] Logout success:', result);
      if (result.ok) {
        clearAuthData();
        toast({
          title: "Success",
          description: result.message,
        });
      }
    },
    onError: (error) => {
      console.error('[Auth Debug] Logout error:', error);
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
      console.log('[Auth Debug] Register success:', result);
      if (result.ok) {
        queryClient.invalidateQueries({ queryKey: ['user'] });
        toast({
          title: "Success",
          description: result.message,
        });
      }
    },
    onError: (error) => {
      console.error('[Auth Debug] Register error:', error);
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