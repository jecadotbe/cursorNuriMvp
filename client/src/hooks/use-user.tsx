import { useState, useEffect, createContext, useContext } from "react";
import { useToast } from "./use-toast";

interface User {
  id: number;
  username: string;
  email: string;
  profilePicture: string | null;
}

interface UserContextType {
  user: User | null;
  isLoading: boolean;
  login: (username: string, password: string, rememberMe?: boolean) => Promise<boolean>;
  register: (username: string, email: string, password: string) => Promise<boolean>;
  logout: () => Promise<boolean>;
  refetch: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  async function fetchUser() {
    try {
      const response = await fetch("/api/user", {
        credentials: "include",
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error("Error fetching user:", error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchUser();
  }, []);

  async function login(username: string, password: string) {
    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
        credentials: "include",
      });

      const data = await response.json();

      if (response.ok) {
        setUser(data.user); // Directly update user state here
        toast({
          title: "Success",
          description: "Login successful",
        });
        return true;
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: data.message || "Login failed",
        });
        return false;
      }
    } catch (error) {
      console.error("Login error:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "An unexpected error occurred",
      });
      return false;
    }
  }

  async function register(username: string, email: string, password: string) {
    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, email, password }),
        credentials: "include",
      });

      const data = await response.json();

      if (response.ok) {
        setUser(data.user);
        toast({
          title: "Success",
          description: "Registration successful",
        });
        return true;
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: data.message || "Registration failed",
        });
        return false;
      }
    } catch (error) {
      console.error("Registration error:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "An unexpected error occurred",
      });
      return false;
    }
  }

  async function logout() {
    try {
      const response = await fetch("/api/logout", {
        method: "POST",
        credentials: "include",
      });

      if (response.ok) {
        setUser(null);
        toast({
          title: "Success",
          description: "Logout successful",
        });
        return true;
      } else {
        const data = await response.json();
        toast({
          variant: "destructive",
          title: "Error",
          description: data.message || "Logout failed",
        });
        return false;
      }
    } catch (error) {
      console.error("Logout error:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "An unexpected error occurred",
      });
      return false;
    }
  }

  return (
    <UserContext.Provider
      value={{
        user,
        isLoading,
        login,
        register,
        logout,
        refetch: fetchUser,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}