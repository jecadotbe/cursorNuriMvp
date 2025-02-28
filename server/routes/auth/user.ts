import { Router, Request, Response, NextFunction } from "express";

// Track request timestamps per IP to throttle requests
const requestHistory: Record<string, {
  lastTimestamp: number;
  errorCount: number;
  backoffUntil: number | null;
}> = {};

// Throttle middleware
function throttleRequests(req: Request, res: Response, next: NextFunction) {
  const ip = req.ip || '127.0.0.1';
  const now = Date.now();
  
  // Initialize request history for this IP if it doesn't exist
  if (!requestHistory[ip]) {
    requestHistory[ip] = {
      lastTimestamp: now,
      errorCount: 0,
      backoffUntil: null
    };
    return next();
  }
  
  const history = requestHistory[ip];
  
  // If IP is in backoff period, reject the request
  if (history.backoffUntil && now < history.backoffUntil) {
    const retryAfterSecs = Math.ceil((history.backoffUntil - now) / 1000);
    res.set('Retry-After', retryAfterSecs.toString());
    return res.status(429).json({ 
      message: "Too many requests. Please try again later.",
      retryAfter: retryAfterSecs
    });
  }
  
  // Calculate time since last request
  const timeSinceLastRequest = now - history.lastTimestamp;
  
  // For user endpoint, enforce a minimum of 2000ms between requests
  // This is very aggressive but necessary to prevent continuous polling
  if (timeSinceLastRequest < 2000) {
    // Increment error count
    history.errorCount += 1;
    
    // If many rapid requests, implement exponential backoff
    if (history.errorCount > 5) {
      const backoffTime = Math.min(Math.pow(2, history.errorCount - 5) * 1000, 30000); // Max 30s backoff
      history.backoffUntil = now + backoffTime;
      
      const retryAfterSecs = Math.ceil(backoffTime / 1000);
      res.set('Retry-After', retryAfterSecs.toString());
      return res.status(429).json({ 
        message: "Rate limit exceeded. Please try again later.",
        retryAfter: retryAfterSecs
      });
    }
    
    // Simply reject with 429 Too Many Requests
    res.set('Retry-After', '2');
    return res.status(429).json({ 
      message: "Too many requests. Please wait before retrying.",
      retryAfter: 2
    });
  }
  
  // Reset error count if request is outside the window
  if (timeSinceLastRequest > 5000) {
    history.errorCount = 0;
  }
  
  // Update last request timestamp
  history.lastTimestamp = now;
  
  next();
}

/**
 * Setup user info route 
 * @param router Express router to attach routes to
 */
export function setupUserRoute(router: Router) {
  router.get("/user", throttleRequests, (req: Request, res: Response) => {
    // Check if user is authenticated
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Session expired" });
    }

    // Cache headers to encourage browsers to cache the response
    res.set('Cache-Control', 'private, max-age=10');  // 10 second cache
    
    // Return user information without password
    return res.json({
      user: {
        id: req.user.id,
        username: req.user.username,
        email: req.user.email,
        profilePicture: req.user.profilePicture,
        createdAt: req.user.createdAt
      }
    });
  });
}