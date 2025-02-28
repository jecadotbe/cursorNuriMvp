import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { User } from "@db/schema";
import { useToast } from '@/hooks/use-toast';

type LoginData = {
  username: string;
  password: string;
  rememberMe?: boolean;
};

type RegisterData = {
  username: string;
  email: string;
  password: string;
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
        // Remove cache headers to ensure we're not fighting with the server's cache policy
      },
      body: body ? JSON.stringify(body) : undefined,
      credentials: "include", // Important! Ensures cookies are sent with the request
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
    console.log("Fetching user data...");
    const response = await fetch('/api/user', {
      credentials: 'include', // Critical for session cookies
      cache: 'no-cache', // Ensure fresh data
    });

    if (!response.ok) {
      if (response.status === 401) {
        console.log("User not authenticated");
        return null;
      }
      
      console.error(`Error fetching user: ${response.status}`);
      throw new Error(`${response.status}: ${await response.text()}`);
    }

    const data = await response.json();
    console.log("User data fetched successfully:", data);
    return data; // The API directly returns the user object
  } catch (error) {
    console.error('Error fetching user:', error);
    return null;
  }
}

export function useUser() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // More aggressive data fetching strategy
  const { data: user, error, isLoading, refetch } = useQuery<User | null, Error>({
    queryKey: ['user'],
    queryFn: fetchUser,
    staleTime: 5 * 60 * 1000, // Consider stale after 5 minutes
    retry: 1,
    refetchOnWindowFocus: true,
  });

  const loginMutation = useMutation<RequestResult, Error, LoginData>({
    mutationFn: (userData) => handleRequest('/api/login', 'POST', userData),
    onSuccess: async (result) => {
      // Force a refetch of user data after successful login
      await queryClient.invalidateQueries({ queryKey: ['user'] });
      
      // Wait a small amount of time to ensure the invalidation and refetch completes
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Manually trigger a refetch to ensure we have the latest data
      await refetch();
      
      toast({
        title: "Success",
        description: result.message || "Successfully logged in!",
      });
      
      return result;
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
      // Clear all queries to ensure clean state
      queryClient.clear();
      
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
    onSuccess: async (result) => {
      // Force a refetch of user data after successful registration
      await queryClient.invalidateQueries({ queryKey: ['user'] });
      
      // Wait a small amount of time to ensure the invalidation and refetch completes
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Manually trigger a refetch to ensure we have the latest data
      await refetch();
      
      toast({
        title: "Success",
        description: result.message || "Registration successful!",
      });
      
      return result;
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
    refetch, // Expose refetch to allow forced refreshes
  };
}