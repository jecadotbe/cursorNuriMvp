import { Router, Request, Response } from "express";

/**
 * Setup logout route
 * @param router Express router to attach routes to
 */
export function setupLogoutRoute(router: Router) {
  router.post("/logout", (req: Request, res: Response) => {
    console.log("Logout attempt from user:", req.user?.username || "unknown");
    
    // Even if user is not authenticated, we want to clear cookies and destroy the session
    // to ensure a clean state
    
    // Get the name of the session cookie that needs to be cleared
    const cookieName = "nuri.session"; // This should match your Express session cookie name
    
    // Clear any auth-related cookies by setting expiration in the past
    res.clearCookie(cookieName, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      sameSite: "lax"
    });
    
    // Set cache control headers to prevent caching of this response
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    // Perform passport logout, which clears the login state
    if (req.isAuthenticated()) {
      req.logout((err) => {
        if (err) {
          console.error("Passport logout error:", err);
          // Continue with session destruction even if passport logout failed
        }
        
        // Destroy session to clear any server-side state
        if (req.session) {
          req.session.destroy((err) => {
            if (err) {
              console.error("Session destruction error:", err);
              return res.status(500).json({ 
                message: "Partially logged out - client state cleared but server session error occurred",
                error: err.message
              });
            }
            
            console.log("Logout successful - session destroyed and cookies cleared");
            return res.json({ 
              message: "Successfully logged out",
              logoutTime: new Date().toISOString()
            });
          });
        } else {
          console.log("Logout successful - no session to destroy");
          return res.json({ 
            message: "Successfully logged out",
            logoutTime: new Date().toISOString()
          });
        }
      });
    } else {
      // User was not authenticated, but we still want to clean up any session data
      if (req.session) {
        req.session.destroy((err) => {
          if (err) {
            console.error("Session destruction error (unauthenticated user):", err);
          }
          
          console.log("Unauthenticated user session cleared");
          return res.json({ 
            message: "No active session found, but cookies were cleared" 
          });
        });
      } else {
        console.log("No session or authentication to clear");
        return res.json({ 
          message: "No active session found, but cookies were cleared" 
        });
      }
    }
  });
}