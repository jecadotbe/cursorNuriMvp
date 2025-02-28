import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { User } from "@db/schema";
import { useToast } from '@/hooks/use-toast';

type LoginData = {
  username: string;
  password: string;
};

type RegisterData = LoginData & {
  email: string;
};

type RequestResult = {
  user?: User;
  message: string;
};

async function handleRequest(
  url: string,
  method: string,
  body?: LoginData | RegisterData
): Promise<RequestResult> {
  try {
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

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || response.statusText);
    }

    return {
      user: data.user,
      message: data.message
    };
  } catch (error) {
    throw error instanceof Error ? error : new Error('An unexpected error occurred');
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

  // Use a session storage flag to prevent excessive fetching
  const sessionFetched = typeof window !== 'undefined' ? sessionStorage.getItem('userFetched') : null;
  
  const { data: user, error, isLoading } = useQuery<User | null, Error>({
    queryKey: ['user'],
    queryFn: async () => {
      // Only fetch once per session unless explicitly invalidated
      if (sessionFetched) {
        const cachedUser = sessionStorage.getItem('cachedUser');
        if (cachedUser) {
          return JSON.parse(cachedUser);
        }
      }
      
      const result = await fetchUser();
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('userFetched', 'true');
        sessionStorage.setItem('cachedUser', JSON.stringify(result));
      }
      return result;
    },
    staleTime: Infinity, // Never consider stale automatically
    gcTime: Infinity,   // Never garbage collect automatically
    refetchOnWindowFocus: false,
    refetchInterval: false,
    retry: false,
    refetchOnMount: false
  });

  const loginMutation = useMutation<RequestResult, Error, LoginData>({
    mutationFn: (userData) => handleRequest('/api/login', 'POST', userData),
    onSuccess: (result) => {
      // Clear session storage on login to force a new fetch
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('userFetched');
        sessionStorage.removeItem('cachedUser');
      }
      queryClient.invalidateQueries({ queryKey: ['user'] });
      toast({
        title: "Success",
        description: result.message || "Successfully logged in!",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: error.message || "Invalid username or password",
      });
      throw error;
    }
  });

  const logoutMutation = useMutation<RequestResult, Error>({
    mutationFn: () => handleRequest('/api/logout', 'POST'),
    onSuccess: (result) => {
      // Clear session storage on logout
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('userFetched');
        sessionStorage.removeItem('cachedUser');
      }
      queryClient.clear();
      queryClient.invalidateQueries({ queryKey: ['user'] });
      toast({
        title: "Success",
        description: result.message || "Successfully logged out!",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Logout Failed",
        description: error.message,
      });
      throw error;
    }
  });

  const registerMutation = useMutation<RequestResult, Error, RegisterData>({
    mutationFn: (userData) => handleRequest('/api/register', 'POST', userData),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['user'] });
      toast({
        title: "Success",
        description: result.message || "Registration successful!",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Registration Failed",
        description: error.message,
      });
      throw error;
    }
  });

  return {
    user,
    isLoading,
    error,
    login: loginMutation.mutateAsync,
    logout: logoutMutation.mutateAsync,
    register: registerMutation.mutateAsync,
  };
}