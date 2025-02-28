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
      console.log("Fetching current user data");
      const response = await fetch("/api/user", {
        credentials: "include",
        headers: { 
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Pragma": "no-cache"
        }
      });

      console.log("User fetch response status:", response.status);

      if (response.ok) {
        const userData = await response.json();
        console.log("User data received:", userData);
        setUser(userData);
      } else {
        const errorText = await response.text();
        console.log("User fetch failed:", response.status, errorText);
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

  async function login(username: string, password: string, rememberMe: boolean = false) {
    try {
      console.log("Attempting login", { username, rememberMe });
      
      const response = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          username, 
          password, 
          rememberMe 
        }),
        credentials: "include", // Important for cookies
      });

      const data = await response.json();

      if (response.ok) {
        console.log("Login successful", data.user);
        setUser(data.user); // Update user state with the response data
        
        // Verify session by making another request
        const sessionCheck = await fetch("/api/user", { 
          credentials: "include",
          // Add cache-busting to prevent cached responses
          headers: { 
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache"
          }
        });
        
        console.log("Session check status:", sessionCheck.status);
        
        if (!sessionCheck.ok) {
          console.warn("Session check failed after login");
        }
        
        toast({
          title: "Success",
          description: "Login successful",
        });
        return true;
      } else {
        console.error("Login response error:", data.message);
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
      console.log("Attempting logout...");
      
      const response = await fetch("/api/logout", {
        method: "POST",
        credentials: "include",
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Pragma": "no-cache"
        }
      });

      // Always clear the user state in the client
      setUser(null);
      
      if (response.ok) {
        console.log("Logout successful on server");
        toast({
          title: "Success",
          description: "Logout successful",
        });
        
        // Verify session cleared
        try {
          const verifyLogout = await fetch("/api/user", {
            credentials: "include",
            headers: {
              "Cache-Control": "no-cache, no-store, must-revalidate",
              "Pragma": "no-cache"
            }
          });
          
          console.log("Logout verification status:", verifyLogout.status);
          
          if (verifyLogout.status !== 401) {
            console.warn("Session may not be fully cleared, but client state is reset");
          }
        } catch (verifyError) {
          console.log("Logout verification error (expected):", verifyError);
        }
        
        return true;
      } else {
        let errorMessage = "Logout failed";
        try {
          const data = await response.json();
          errorMessage = data.message || errorMessage;
        } catch (e) {
          // Response might not contain JSON
          console.warn("Non-JSON response from logout endpoint");
        }
        
        console.error("Logout error:", errorMessage);
        toast({
          variant: "destructive",
          title: "Error",
          description: errorMessage
        });
        return false;
      }
    } catch (error) {
      console.error("Logout error:", error);
      // Still clear local state even if server request fails
      setUser(null);
      toast({
        variant: "destructive",
        title: "Warning",
        description: "Logged out locally, but server sync failed"
      });
      return true; // Return true since we're logged out locally
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