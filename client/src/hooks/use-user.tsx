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
      setIsLoading(true);
      
      const response = await fetch("/api/user", {
        credentials: "include",
        headers: { 
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Pragma": "no-cache"
        }
      });

      console.log("User fetch response status:", response.status);

      if (response.ok) {
        try {
          const userData = await response.json();
          console.log("User data received:", userData);
          setUser(userData);
          return userData; // Return the user data for use in calling functions
        } catch (parseError) {
          console.error("Error parsing user data:", parseError);
          setUser(null);
          return null;
        }
      } else {
        let errorMessage = "Session expired";
        
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          // Response may not contain JSON
          try {
            const errorText = await response.text();
            if (errorText) {
              console.log("User fetch error text:", errorText);
            }
          } catch (textError) {
            // Unable to read response body
          }
        }
        
        console.log("User fetch failed:", response.status, errorMessage);
        
        // Clear user state on auth failure
        setUser(null);
        
        // Only show toast for unexpected errors, not for normal session expiration
        if (response.status !== 401) {
          toast({
            variant: "destructive",
            title: "Authentication Error",
            description: errorMessage
          });
        }
        
        return null;
      }
    } catch (error) {
      console.error("Error fetching user:", error);
      setUser(null);
      return null;
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
      
      // Clear any existing user state before trying to log in
      setUser(null);
      setIsLoading(true);
      
      const response = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Pragma": "no-cache"
        },
        body: JSON.stringify({ 
          username, 
          password, 
          rememberMe 
        }),
        credentials: "include", // Important for cookies
      });

      // Handle non-JSON responses
      let data;
      try {
        data = await response.json();
      } catch (e) {
        console.error("Invalid JSON response from login:", e);
        setIsLoading(false);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Invalid server response"
        });
        return false;
      }

      if (response.ok) {
        console.log("Login successful", data.user);
        setUser(data.user); // Update user state with the response data
        
        // Add a short delay before verification to allow session to stabilize
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Verify session by making another request
        try {
          const sessionCheck = await fetch("/api/user", { 
            credentials: "include",
            // Add cache-busting to prevent cached responses
            headers: { 
              "Cache-Control": "no-cache, no-store, must-revalidate",
              "Pragma": "no-cache"
            }
          });
          
          console.log("Session verification status:", sessionCheck.status);
          
          if (sessionCheck.ok) {
            const verifiedUser = await sessionCheck.json();
            console.log("Session verification successful:", verifiedUser);
            
            // Update user state with the latest data from server
            setUser(verifiedUser);
          } else {
            console.warn("Session verification failed after login:", sessionCheck.status);
            // Keep the user logged in on client side anyway since login succeeded
          }
        } catch (verifyError) {
          console.error("Session verification error:", verifyError);
        }
        
        toast({
          title: "Welcome!",
          description: "Login successful",
        });
        
        setIsLoading(false);
        return true;
      } else {
        console.error("Login response error:", data.message);
        setIsLoading(false);
        toast({
          variant: "destructive",
          title: "Authentication Failed",
          description: data.message || "Login failed",
        });
        return false;
      }
    } catch (error) {
      console.error("Login error:", error);
      setIsLoading(false);
      toast({
        variant: "destructive",
        title: "Connection Error",
        description: "Failed to connect to the server. Please try again."
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