
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useUser } from "@/hooks/use-user";
import { useToast } from "@/hooks/use-toast";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading, refetch } = useUser();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 1; // Maximum retry attempts before giving up

  // Session validation and expiration handling
  useEffect(() => {
    // Handle user not being authenticated
    if (!isLoading && !user) {
      if (retryCount < MAX_RETRIES) {
        // Attempt to refresh user data before giving up
        const timer = setTimeout(() => {
          console.log("Session not found, retrying authentication...");
          setRetryCount(prevCount => prevCount + 1);
          refetch(); // Try to re-fetch user data
        }, 1000); // Wait 1 second before retry
        return () => clearTimeout(timer);
      } else if (!isRedirecting) {
        // We've tried enough, redirect to login
        setIsRedirecting(true);
        toast({
          title: "Session Expired",
          description: "Your session has expired. Please log in again.",
          variant: "destructive"
        });
        
        // Small delay to allow toast to render before redirect
        setTimeout(() => {
          setLocation("/auth?session=expired");
        }, 500);
      }
    }
  }, [user, isLoading, retryCount, refetch, setLocation, toast, isRedirecting]);

  // Periodic session validation (every 2 minutes)
  useEffect(() => {
    if (user) {
      const sessionCheckInterval = setInterval(() => {
        console.log("Performing periodic session validation check");
        refetch();
      }, 2 * 60 * 1000); // Check every 2 minutes
      
      return () => clearInterval(sessionCheckInterval);
    }
  }, [user, refetch]);

  if (isLoading || (retryCount > 0 && retryCount < MAX_RETRIES)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900 mb-4"></div>
        <p className="text-sm text-gray-600">
          {isLoading ? "Loading..." : "Verifying session..."}
        </p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}
