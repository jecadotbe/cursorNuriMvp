import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { User } from "@db/schema";
import { useToast } from '@/hooks/use-toast';
import { Mixpanel } from "@/lib/mixpanel"; // Added Mixpanel import

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

  const { data: user, error, isLoading } = useQuery<User | null, Error>({
    queryKey: ['user'],
    queryFn: fetchUser,
    staleTime: 0,
    gcTime: 0,
    retry: false
  });

  const loginMutation = useMutation<RequestResult, Error, LoginData>({
    mutationFn: (userData) => handleRequest('/api/login', 'POST', userData),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['user'] });
      toast({
        title: "Success",
        description: result.message || "Successfully logged in!",
      });
      //Track successful login -  Assuming result.user contains necessary data.  Adjust as needed.
      if (result.user) {
          Mixpanel.track('User Logged In', {
              username: result.user.username // Replace with actual username property if different.
          });
          Mixpanel.setUser(result.user); //Set user identity
      }

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
      queryClient.clear();
      queryClient.invalidateQueries({ queryKey: ['user'] });
      toast({
        title: "Success",
        description: result.message || "Successfully logged out!",
      });
      Mixpanel.track('User Logged Out'); // Track user logout
      Mixpanel.reset(); // Reset Mixpanel user identity
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
      //Track successful registration - Assuming result.user contains necessary data. Adjust as needed.
      if (result.user) {
          Mixpanel.track('User Registered', {
              email: result.user.email // Replace with actual email property if different.
          });
      }
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